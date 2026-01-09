/*
  # Add gender and birth date to profiles table

  1. Schema Changes
    - Add `gender` column to `profiles` table
      - Type: text
      - Values: 'male', 'female', 'other', or null
      - Default: null (optional field)
    
    - Add `birth_date` column to `profiles` table
      - Type: date
      - Default: null (optional field)
  
  2. Security
    - No RLS changes needed
    - Users can update their own profile fields through existing policies
  
  3. Important Notes
    - Both fields are optional (nullable)
    - Gender uses text type for flexibility
    - Birth date stored as date type for proper date handling
*/

-- Add gender column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE profiles ADD COLUMN gender text;
  END IF;
END $$;

-- Add birth_date column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN birth_date date;
  END IF;
END $$;

-- Add check constraint for gender values (optional, for data integrity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_gender_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_gender_check 
      CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
  END IF;
END $$;
