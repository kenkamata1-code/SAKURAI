/*
  # Add product images and category enum

  1. New Tables
    - `product_images`
      - `id` (uuid, primary key)
      - `product_id` (uuid, references products)
      - `url` (text) - Image or video URL
      - `display_order` (integer) - Order for display (1-6)
      - `created_at` (timestamptz)
  
  2. Changes to Products Table
    - Add `category` (text) - Product category: 'shoes' or 'accessory'
    - Keep existing `category_id` for backward compatibility
    - Keep existing `image_url` as primary/thumbnail image
  
  3. Security
    - Enable RLS on `product_images` table
    - Public can view product images
    - Authenticated users can manage product images
  
  4. Important Notes
    - Maximum 6 images per product
    - display_order ranges from 1 to 6
    - Category is constrained to 'shoes' or 'accessory' only
*/

-- Add category enum field to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'category'
  ) THEN
    ALTER TABLE products ADD COLUMN category text;
  END IF;
END $$;

-- Add constraint to category field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'products' AND constraint_name = 'products_category_check'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_category_check 
      CHECK (category IN ('shoes', 'accessory'));
  END IF;
END $$;

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  display_order integer NOT NULL CHECK (display_order >= 1 AND display_order <= 6),
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(product_id, display_order)
);

-- Enable RLS on product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view product images
CREATE POLICY "Anyone can view product images"
  ON product_images FOR SELECT
  TO public
  USING (true);

-- Policy: Authenticated users can insert product images
CREATE POLICY "Authenticated users can insert product images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update product images
CREATE POLICY "Authenticated users can update product images"
  ON product_images FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can delete product images
CREATE POLICY "Authenticated users can delete product images"
  ON product_images FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_display_order ON product_images(product_id, display_order);
