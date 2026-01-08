/*
  # Create Styling Images Table for Multiple Images

  1. New Tables
    - `styling_images`
      - `id` (uuid, primary key)
      - `styling_id` (uuid, foreign key to styling)
      - `url` (text) - Image URL
      - `display_order` (integer) - Order for displaying images (1, 2, 3)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `styling_images` table
    - Add policy for public to read images
    - Add policy for authenticated admins to manage images

  3. Indexes
    - Add index on styling_id for faster lookups
    - Add index on display_order for sorting
*/

CREATE TABLE IF NOT EXISTS styling_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  styling_id uuid NOT NULL REFERENCES styling(id) ON DELETE CASCADE,
  url text NOT NULL,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_styling_images_styling_id ON styling_images(styling_id);
CREATE INDEX IF NOT EXISTS idx_styling_images_display_order ON styling_images(display_order);

ALTER TABLE styling_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view styling images"
  ON styling_images
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can insert styling images"
  ON styling_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update styling images"
  ON styling_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete styling images"
  ON styling_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );