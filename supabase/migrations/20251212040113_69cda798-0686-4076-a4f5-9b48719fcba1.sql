-- Add current_location column to asset_master_data with default 'Kho'
ALTER TABLE public.asset_master_data 
ADD COLUMN current_location text DEFAULT 'Kho';

-- Update existing assets to have 'Kho' as default location
UPDATE public.asset_master_data SET current_location = 'Kho' WHERE current_location IS NULL;

-- Create trigger to update asset location when new location history is added
CREATE OR REPLACE FUNCTION public.update_asset_location()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.asset_master_data 
  SET current_location = NEW.location, updated_at = now()
  WHERE id = NEW.asset_master_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_location_history_insert
AFTER INSERT ON public.asset_location_history
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_location();