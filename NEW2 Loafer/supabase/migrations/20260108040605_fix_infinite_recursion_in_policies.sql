/*
  # Fix infinite recursion in RLS policies

  1. Changes
    - Drop existing admin check policies that cause infinite recursion
    - Create a SECURITY DEFINER function to check admin status
    - Recreate policies using the new function to avoid recursion
  
  2. Security
    - The is_user_admin() function bypasses RLS to check admin status
    - All policies still enforce proper access control
    - Users can only access their own data
    - Admins can access all data
  
  3. Important Notes
    - SECURITY DEFINER functions run with the privileges of the function owner
    - This is safe because it only checks a single boolean value
    - The function is read-only and cannot modify data
*/

-- Create a function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND is_admin = true
  );
END;
$$;

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- Recreate admin policies using the new function
CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  TO authenticated
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (public.is_user_admin(auth.uid()))
  WITH CHECK (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (public.is_user_admin(auth.uid()));
