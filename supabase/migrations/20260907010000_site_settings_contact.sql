-- WhatsApp enquiry number + Cloudinary upload config, stored centrally instead of per-browser localStorage
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number text NOT NULL DEFAULT '916383490216',
  ADD COLUMN IF NOT EXISTS cloudinary_cloud_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cloudinary_upload_preset text NOT NULL DEFAULT '';
