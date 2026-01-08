/*
  # Add variant_id to cart_items table

  1. Changes
    - Add `variant_id` column to `cart_items` table
    - Add foreign key constraint to `product_variants`
    - Update RLS policies to work with variants

  2. Notes
    - Existing cart items without variant_id will need to be handled
    - This allows customers to add the same product with different sizes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE;
  END IF;
END $$;