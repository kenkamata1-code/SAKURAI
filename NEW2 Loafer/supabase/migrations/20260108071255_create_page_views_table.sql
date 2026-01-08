/*
  # Create Page Views Tracking Table

  1. New Tables
    - `page_views`
      - `id` (uuid, primary key)
      - `page_path` (text) - The path of the page visited
      - `page_title` (text) - The title/name of the page
      - `user_id` (uuid, nullable) - Reference to auth.users if logged in
      - `session_id` (text) - Anonymous session identifier
      - `created_at` (timestamptz) - When the view occurred

  2. Indexes
    - Index on `page_path` for quick filtering
    - Index on `created_at` for time-based queries
    - Index on `user_id` for user-specific analytics

  3. Security
    - Enable RLS
    - Allow authenticated users to insert their own page views
    - Allow admins to read all page views
*/

CREATE TABLE IF NOT EXISTS page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  page_title text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert page views"
  ON page_views
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Admins can view all page views"
  ON page_views
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );