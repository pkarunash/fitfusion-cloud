export type CloudinaryConfig = { cloudName: string; uploadPreset: string };

export function isCloudinaryConfigured(config: CloudinaryConfig): boolean {
  return Boolean(config.cloudName && config.uploadPreset);
}

/** Unsigned browser upload straight to Cloudinary. Returns the secure https URL. */
export async function uploadToCloudinary(file: File, config: CloudinaryConfig, folder = "gym"): Promise<string> {
  if (!isCloudinaryConfigured(config)) {
    throw new Error("Cloudinary is not configured yet. Add your cloud name and upload preset in Admin → Site settings.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", config.uploadPreset);
  form.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message ?? "Cloudinary upload failed");
  }
  return json.secure_url;
}

/** Adds Cloudinary transformations (auto format/quality + width) to a delivery URL. */
export function cld(url: string | undefined, width = 600): string {
  if (!url) return "";
  if (!url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
}
