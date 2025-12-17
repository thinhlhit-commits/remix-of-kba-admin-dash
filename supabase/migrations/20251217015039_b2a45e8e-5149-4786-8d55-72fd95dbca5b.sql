-- Drop the existing foreign key constraint on allocated_to
ALTER TABLE public.asset_allocations 
DROP CONSTRAINT IF EXISTS asset_allocations_allocated_to_fkey;

-- Add new foreign key constraint pointing to employees table
ALTER TABLE public.asset_allocations
ADD CONSTRAINT asset_allocations_allocated_to_fkey 
FOREIGN KEY (allocated_to) REFERENCES public.employees(id) ON DELETE SET NULL;

-- Also update allocated_by to reference employees if needed
ALTER TABLE public.asset_allocations 
DROP CONSTRAINT IF EXISTS asset_allocations_allocated_by_fkey;

ALTER TABLE public.asset_allocations
ADD CONSTRAINT asset_allocations_allocated_by_fkey 
FOREIGN KEY (allocated_by) REFERENCES public.employees(id) ON DELETE SET NULL;