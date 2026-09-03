const LS_KEY = "gym.cloudinary.config";

export type CloudinaryConfig = { cloudName: string; uploadPreset: string };

const envConfig: CloudinaryConfig = {
  cloudName: (import.meta.env["VITE_CLOUDINARY_CLOUD_NAME"] as string | undefined) ?? "",
  uploadPreset: (import.meta.env["VITE_CLOUDINARY_UPLOAD_PRESET"] as string | undefined) ?? "",
};

export function getCloudinaryConfig(): CloudinaryConfig {
  if (typeof window === "undefined") return envConfig;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CloudinaryConfig>;
      if (parsed.cloudName && parsed.uploadPreset) {
        return { cloudName: parsed.cloudName, uploadPreset: parsed.uploadPreset };
      }
    }
  } catch {
    /* ignore malformed config */
  }
  return envConfig;
}

export function saveCloudinaryConfig(config: CloudinaryConfig) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(config));
}

export function isCloudinaryConfigured() {
  const c = getCloudinaryConfig();
  return Boolean(c.cloudName && c.uploadPreset);
}

/** Unsigned browser upload straight to Cloudinary. Returns the secure https URL. */
export async function uploadToCloudinary(file: File, folder = "gym"): Promise<string> {
  const { cloudName, uploadPreset } = getCloudinaryConfig();
  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary is not configured yet. Add your cloud name and upload preset first.");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);
  form.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
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
