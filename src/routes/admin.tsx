import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  cld,
  getCloudinaryConfig,
  isCloudinaryConfigured,
  saveCloudinaryConfig,
  uploadToCloudinary,
} from "@/lib/cloudinary";
import { inr } from "@/hooks/useCart";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Manage Store & Plans | IronForge Gym" },
      { name: "description", content: "Admin tools to manage IronForge products, images and membership fee plans." },
      { property: "og:title", content: "Admin — IronForge Gym" },
      { property: "og:description", content: "Manage products, images and membership plans." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type SpecRow = { label: string; value: string };

const emptyForm = {
  name: "",
  slug: "",
  category: "protein",
  brand: "",
  description: "",
  price: "",
  mrp: "",
  stock: "0",
};

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="px-4 py-10 text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl">Admin sign in required</h1>
        <Link to="/auth" className="btn-primary mt-6">
          Sign in
        </Link>
      </div>
    );
  if (!isAdmin)
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-3xl">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account ({user.email}) doesn't have the admin role yet. Ask an existing admin to grant it.
        </p>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <h1 className="text-4xl">Admin</h1>
      <CloudinarySettings />
      <ProductManager />
      <PlanManager />
    </div>
  );
}

function CloudinarySettings() {
  const [cloudName, setCloudName] = useState("");
  const [uploadPreset, setUploadPreset] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const c = getCloudinaryConfig();
    setCloudName(c.cloudName);
    setUploadPreset(c.uploadPreset);
    setReady(isCloudinaryConfigured());
  }, []);

  return (
    <section className="surface-card p-5">
      <h2 className="text-2xl">Cloudinary image storage</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Product and chat photos upload straight to your Cloudinary account with an unsigned upload preset.{" "}
        {ready ? (
          <span className="font-semibold text-success">Connected.</span>
        ) : (
          <span className="font-semibold text-accent">Not configured yet.</span>
        )}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          value={cloudName}
          onChange={(e) => setCloudName(e.target.value)}
          placeholder="Cloud name (e.g. dq1a2b3c)"
          className="field"
        />
        <input
          value={uploadPreset}
          onChange={(e) => setUploadPreset(e.target.value)}
          placeholder="Unsigned upload preset"
          className="field"
        />
        <button
          onClick={() => {
            saveCloudinaryConfig({ cloudName: cloudName.trim(), uploadPreset: uploadPreset.trim() });
            setReady(isCloudinaryConfigured());
            toast.success("Cloudinary settings saved");
          }}
          className="btn-primary"
        >
          Save
        </button>
      </div>
    </section>
  );
}

function ProductManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [specs, setSpecs] = useState<SpecRow[]>([{ label: "", value: "" }]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function handleFiles(files: FileList) {
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadToCloudinary(file, "gym/products"));
      setImages((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    const slug =
      form.slug.trim() ||
      form.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("products").insert({
      name: form.name.trim(),
      slug,
      category: form.category,
      brand: form.brand.trim() || null,
      description: form.description.trim() || null,
      price: Number(form.price),
      mrp: form.mrp ? Number(form.mrp) : null,
      stock: Number(form.stock || 0),
      images,
      specifications: specs.filter((s) => s.label.trim() && s.value.trim()),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product added");
    setForm(emptyForm);
    setSpecs([{ label: "", value: "" }]);
    setImages([]);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function toggleActive(id: string, next: boolean) {
    const { error } = await supabase.from("products").update({ is_active: next }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function removeProduct(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <section className="surface-card p-5">
      <h2 className="text-2xl">Add product</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Product name"
          className="field"
        />
        <input
          value={form.brand}
          onChange={(e) => setForm({ ...form, brand: e.target.value })}
          placeholder="Brand"
          className="field"
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="field"
        >
          <option value="protein">Protein & Supplements</option>
          <option value="equipment">Equipment</option>
          <option value="accessory">Accessory</option>
        </select>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="URL slug (optional)"
          className="field"
        />
        <input
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="Selling price ₹"
          type="number"
          className="field"
        />
        <input
          value={form.mrp}
          onChange={(e) => setForm({ ...form, mrp: e.target.value })}
          placeholder="MRP ₹"
          type="number"
          className="field"
        />
        <input
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          placeholder="Stock"
          type="number"
          className="field"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
          rows={3}
          className="field md:col-span-2"
        />
      </div>

      <h3 className="mt-5 text-xl">Images (Cloudinary)</h3>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {images.map((url) => (
          <div key={url} className="relative size-20 overflow-hidden rounded-lg border border-border">
            <img src={cld(url, 160)} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
              className="absolute right-0 top-0 bg-destructive p-0.5 text-destructive-foreground"
              aria-label="Remove image"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        <label className="btn-outline cursor-pointer">
          <Upload className="size-4" />
          {uploading ? "Uploading…" : "Upload images"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <h3 className="mt-5 text-xl">Specifications</h3>
      <div className="mt-2 space-y-2">
        {specs.map((s, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={s.label}
              onChange={(e) => setSpecs(specs.map((x, j) => (i === j ? { ...x, label: e.target.value } : x)))}
              placeholder="Label (e.g. Protein per serving)"
              className="field"
            />
            <input
              value={s.value}
              onChange={(e) => setSpecs(specs.map((x, j) => (i === j ? { ...x, value: e.target.value } : x)))}
              placeholder="Value (e.g. 27 g)"
              className="field"
            />
            <button
              onClick={() => setSpecs(specs.filter((_, j) => j !== i))}
              className="btn-outline px-3"
              aria-label="Remove spec"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <button onClick={() => setSpecs([...specs, { label: "", value: "" }])} className="btn-outline">
          <Plus className="size-4" /> Add specification
        </button>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary mt-5">
        {saving ? "Saving…" : "Publish product"}
      </button>

      <h3 className="mt-8 text-xl">Catalogue ({products?.length ?? 0})</h3>
      <div className="mt-2 divide-y divide-border">
        {(products ?? []).map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {p.images?.[0] ? (
                <img src={cld(p.images[0], 100)} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.category} · {inr(Number(p.price))} · stock {p.stock}
              </p>
            </div>
            <button onClick={() => toggleActive(p.id, !p.is_active)} className="btn-outline px-3 py-1 text-xs">
              {p.is_active ? "Hide" : "Show"}
            </button>
            <button
              onClick={() => removeProduct(p.id)}
              className="rounded-lg p-2 text-destructive hover:bg-muted"
              aria-label="Delete product"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function PlanManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    duration_months: "1",
    price: "",
    original_price: "",
    description: "",
    features: "",
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("membership_plans").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  async function save() {
    if (!form.name.trim() || !form.price) return toast.error("Name and price are required");
    const { error } = await supabase.from("membership_plans").insert({
      name: form.name.trim(),
      duration_months: Number(form.duration_months || 1),
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      description: form.description.trim() || null,
      features: form.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      sort_order: (plans?.length ?? 0) + 1,
    });
    if (error) return toast.error(error.message);
    toast.success("Plan added");
    setForm({ name: "", duration_months: "1", price: "", original_price: "", description: "", features: "" });
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
    qc.invalidateQueries({ queryKey: ["plans"] });
  }

  async function removePlan(id: string) {
    const { error } = await supabase.from("membership_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-plans"] });
    qc.invalidateQueries({ queryKey: ["plans"] });
  }

  return (
    <section className="surface-card p-5">
      <h2 className="text-2xl">Membership fee plans</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Plan name"
          className="field"
        />
        <input
          value={form.duration_months}
          onChange={(e) => setForm({ ...form, duration_months: e.target.value })}
          placeholder="Duration (months)"
          type="number"
          className="field"
        />
        <input
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          placeholder="Fee ₹"
          type="number"
          className="field"
        />
        <input
          value={form.original_price}
          onChange={(e) => setForm({ ...form, original_price: e.target.value })}
          placeholder="Original fee ₹"
          type="number"
          className="field"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Short description"
          rows={2}
          className="field md:col-span-2"
        />
        <textarea
          value={form.features}
          onChange={(e) => setForm({ ...form, features: e.target.value })}
          placeholder="One feature per line"
          rows={4}
          className="field md:col-span-2"
        />
      </div>
      <button onClick={save} className="btn-primary mt-4">
        Add plan
      </button>

      <div className="mt-6 divide-y divide-border">
        {(plans ?? []).map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <div className="flex-1">
              <p className="text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.duration_months} mo · {inr(Number(p.price))}
              </p>
            </div>
            <button
              onClick={() => removePlan(p.id)}
              className="rounded-lg p-2 text-destructive hover:bg-muted"
              aria-label="Delete plan"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
