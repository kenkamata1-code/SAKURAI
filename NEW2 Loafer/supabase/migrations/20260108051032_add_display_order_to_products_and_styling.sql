/*
  # Add Display Order to Products and Styling Tables

  1. Changes
    - Add `display_order` column to `products` table
      - Type: integer
      - Default: 0
      - Used for custom ordering in admin interfaces
    
    - Add `display_order` column to `styling` table
      - Type: integer
      - Default: 0
      - Used for custom ordering in admin interfaces
    
    - Create indexes for faster sorting queries

  2. Data Migration
    - Set initial display_order values based on created_at timestamp
    - Older items get lower numbers (displayed first)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE products ADD COLUMN display_order integer DEFAULT 0;
    
    WITH ordered_products AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
      FROM products
    )
    UPDATE products
    SET display_order = ordered_products.row_num
    FROM ordered_products
    WHERE products.id = ordered_products.id;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'styling' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE styling ADD COLUMN display_order integer DEFAULT 0;
    
    WITH ordered_styling AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
      FROM styling
    )
    UPDATE styling
    SET display_order = ordered_styling.row_num
    FROM ordered_styling
    WHERE styling.id = ordered_styling.id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_display_order ON products(display_order);
CREATE INDEX IF NOT EXISTS idx_styling_display_order ON styling(display_order);