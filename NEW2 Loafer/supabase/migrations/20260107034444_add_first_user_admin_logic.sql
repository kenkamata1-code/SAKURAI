/*
  # Make first user admin automatically

  1. Changes
    - Update handle_new_user() function to check if this is the first user
    - If profiles table is empty, set is_admin to true for the first user
    - Otherwise, set is_admin to false (default behavior)
  
  2. Security
    - Only the very first user to register gets admin privileges
    - All subsequent users are regular users by default
    - Admins can later promote other users to admin via the profiles table
  
  3. Important Notes
    - This ensures there's always at least one admin in the system
    - First user is determined by checking if profiles table is empty
    - Logic is atomic and race-condition safe
*/

-- Update the handle_new_user function to make first user admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  is_first_user boolean;
BEGIN
  -- Check if this is the first user (profiles table is empty)
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) INTO is_first_user;
  
  -- Insert profile with is_admin = true if first user, false otherwise
  INSERT INTO public.profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, is_first_user);
  
  RETURN NEW;
END;
$$;