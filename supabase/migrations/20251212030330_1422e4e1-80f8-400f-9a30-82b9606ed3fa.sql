-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('database-backups', 'database-backups', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Only admins can access backups
CREATE POLICY "Admins can manage backups"
ON storage.objects
FOR ALL
USING (bucket_id = 'database-backups' AND has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'database-backups' AND has_role(auth.uid(), 'admin'));