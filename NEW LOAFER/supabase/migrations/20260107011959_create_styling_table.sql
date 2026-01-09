/*
  # Create styling table

  1. New Tables
    - `styling`
      - `id` (uuid, primary key) - Unique identifier
      - `title` (text) - Styling title
      - `description` (text) - Styling description
      - `image_url` (text) - Image URL for the styling
      - `color` (text) - Product color shown
      - `size` (text) - Size worn
      - `height` (text) - Wearer's height
      - `slug` (text, unique) - URL-friendly identifier
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `styling` table
    - Add policy for public read access (anyone can view styling)
    - Add policy for authenticated users to manage styling (admin functionality)
*/

CREATE TABLE IF NOT EXISTS styling (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  image_url text NOT NULL,
  color text DEFAULT '',
  size text DEFAULT '',
  height text DEFAULT '',
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE styling ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view styling"
  ON styling
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert styling"
  ON styling
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update styling"
  ON styling
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete styling"
  ON styling
  FOR DELETE
  TO authenticated
  USING (true);