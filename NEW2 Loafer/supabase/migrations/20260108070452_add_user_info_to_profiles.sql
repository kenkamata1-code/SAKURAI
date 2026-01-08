/*
  # Add user information fields to profiles table

  1. Schema Changes
    - Add `first_name` column to `profiles` table
      - Type: text
      - Required field for user registration
    
    - Add `last_name` column to `profiles` table
      - Type: text
      - Required field for user registration
    
    - Add `phone` column to `profiles` table
      - Type: text
      - Required field for user registration
    
    - Add `postal_code` column to `profiles` table
      - Type: text
      - Required field for user registration
    
    - Add `address` column to `profiles` table
      - Type: text
      - Required field for user registration
  
  2. Security
    - No RLS changes needed
    - Users can update their own profile fields through existing policies
  
  3. Important Notes
    - These fields will be required during signup
    - Existing users may have NULL values
    - Gender and birth_date fields already exist and will remain required
*/

-- Add first_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN first_name text;
  END IF;
END $$;

-- Add last_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_name text;
  END IF;
END $$;

-- Add phone column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Add postal_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN postal_code text;
  END IF;
END $$;

-- Add address column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;
