-- Drop the restrictive SELECT policy on employees
DROP POLICY IF EXISTS "Admins and HR can view all employees, users can view own record" ON public.employees;

-- Create new policy allowing all authenticated users to view employees
-- This enables adding employees as project team members
CREATE POLICY "Authenticated users can view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (true);