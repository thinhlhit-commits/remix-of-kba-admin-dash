
-- Create trigger to auto-add employee to project team when assigned a task
CREATE OR REPLACE FUNCTION public.auto_add_team_member_on_task_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_user_id uuid;
BEGIN
  -- Only proceed if assigned_to is set
  IF NEW.assigned_to IS NOT NULL THEN
    -- Get the user_id from the employee record
    SELECT user_id INTO employee_user_id
    FROM public.employees
    WHERE id = NEW.assigned_to;
    
    -- If employee has a linked user account, add them to team_members
    IF employee_user_id IS NOT NULL THEN
      -- Insert if not already a team member (ignore if exists)
      INSERT INTO public.team_members (project_id, user_id, role)
      VALUES (NEW.project_id, employee_user_id, 'Thành viên')
      ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create unique constraint on team_members for ON CONFLICT to work
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_project_user_unique 
UNIQUE (project_id, user_id);

-- Create trigger on tasks table
DROP TRIGGER IF EXISTS on_task_assignment_add_team_member ON public.tasks;
CREATE TRIGGER on_task_assignment_add_team_member
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_team_member_on_task_assignment();
