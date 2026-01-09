import pg from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const { Pool } = pg;

// S3クライアント
const s3Client = new S3Client({ region: process.env.AWS_REGION || "ap-northeast-1" });
const S3_BUCKET = process.env.S3_BUCKET || "loafer-product-images-917086196108";

let pool = null;

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      host: process.env.RDS_HOST,
      port: parseInt(process.env.RDS_PORT || "5432"),
      database: process.env.RDS_DATABASE,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const response = (statusCode, body) => ({
  statusCode,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// HTTP API v2 形式のイベントからパスとメソッドを取得
const getRequestInfo = (event) => {
  // API Gateway HTTP API (v2) 形式
  if (event.version === "2.0") {
    return {
      path: event.rawPath || event.requestContext?.http?.path || "",
      method: event.requestContext?.http?.method || "GET",
      body: event.body,
      queryParams: event.queryStringParameters || {},
    };
  }
  
  // REST API (v1) / 直接呼び出し形式
  return {
    path: event.path || "",
    method: event.httpMethod || "GET",
    body: event.body,
    queryParams: event.queryStringParameters || {},
  };
};

// JWTトークンをデコード（署名検証なし - Cognitoが既に検証済み）
const decodeJwt = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload;
  } catch {
    return null;
  }
};

// AuthorizationヘッダーからJWTを取得してデコード
const getJwtClaims = (event) => {
  // まずAPI Gateway Authorizerからの情報を試す
  if (event.version === "2.0" && event.requestContext?.authorizer?.jwt?.claims) {
    return event.requestContext.authorizer.jwt.claims;
  }
  if (event.requestContext?.authorizer?.claims) {
    return event.requestContext.authorizer.claims;
  }
  
  // Authorizerがない場合、Authorizationヘッダーから直接デコード
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader) return null;
  
  const token = authHeader.replace(/^Bearer\s+/i, '');
  return decodeJwt(token);
};

// ユーザーIDを取得（認証済みの場合）
const getUserId = (event) => {
  const claims = getJwtClaims(event);
  return claims?.sub || null;
};

// メールを取得
const getUserEmail = (event) => {
  const claims = getJwtClaims(event);
  return claims?.email || "";
};

// 管理者チェック
const isAdmin = async (db, userId) => {
  if (!userId) return false;
  const result = await db.query(
    "SELECT is_admin FROM profiles WHERE cognito_user_id = $1",
    [userId]
  );
  return result.rows[0]?.is_admin === true;
};

export const handler = async (event) => {
  const { path, method, body, queryParams } = getRequestInfo(event);
  
  // OPTIONS リクエスト（CORS preflight）
  if (method === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  const db = getPool();
  const userId = getUserId(event);

  try {
    // ==================== カテゴリ ====================
    if (path === "/v1/categories" && method === "GET") {
      const result = await db.query("SELECT * FROM categories ORDER BY name");
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/categories\/[\w-]+$/) && method === "GET") {
      const slug = path.split("/").pop();
      const result = await db.query("SELECT * FROM categories WHERE slug = $1", [slug]);
      if (result.rows.length === 0) return response(404, { error: "Category not found" });
      return response(200, result.rows[0]);
    }

    // ==================== 商品 ====================
    if (path === "/v1/products" && method === "GET") {
      let query = `
        SELECT p.*, 
          json_agg(DISTINCT jsonb_build_object(
            'id', pi.id, 'product_id', pi.product_id, 'url', pi.url, 
            'display_order', pi.display_order, 'created_at', pi.created_at
          )) FILTER (WHERE pi.id IS NOT NULL) as product_images,
          json_agg(DISTINCT jsonb_build_object(
            'id', pv.id, 'product_id', pv.product_id, 'size', pv.size,
            'stock', pv.stock, 'sku', pv.sku, 'created_at', pv.created_at
          )) FILTER (WHERE pv.id IS NOT NULL) as product_variants
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
      `;
      const values = [];
      const conditions = [];

      if (queryParams.category) {
        conditions.push(`p.category = $${values.length + 1}`);
        values.push(queryParams.category);
      }
      if (queryParams.featured === "true") {
        conditions.push("p.featured = true");
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }
      query += " GROUP BY p.id ORDER BY p.display_order, p.created_at DESC";

      const result = await db.query(query, values);
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/products\/[\w-]+$/) && method === "GET") {
      const slug = path.split("/").pop();
      const result = await db.query(`
        SELECT p.*, 
          json_agg(DISTINCT jsonb_build_object(
            'id', pi.id, 'product_id', pi.product_id, 'url', pi.url, 
            'display_order', pi.display_order, 'created_at', pi.created_at
          )) FILTER (WHERE pi.id IS NOT NULL) as product_images,
          json_agg(DISTINCT jsonb_build_object(
            'id', pv.id, 'product_id', pv.product_id, 'size', pv.size,
            'stock', pv.stock, 'sku', pv.sku, 'created_at', pv.created_at
          )) FILTER (WHERE pv.id IS NOT NULL) as product_variants
        FROM products p
        LEFT JOIN product_images pi ON p.id = pi.product_id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        WHERE p.slug = $1
        GROUP BY p.id
      `, [slug]);
      if (result.rows.length === 0) return response(404, { error: "Product not found" });
      return response(200, result.rows[0]);
    }

    // ==================== カート ====================
    if (path === "/v1/cart" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query(`
        SELECT ci.*, 
          row_to_json(p.*) as products,
          row_to_json(pv.*) as product_variants
        FROM cart_items ci
        LEFT JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.cognito_user_id = $1
      `, [userId]);
      return response(200, result.rows);
    }

    if (path === "/v1/cart" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { product_id, variant_id, quantity = 1 } = parsedBody;

      // 既存のカートアイテムをチェック
      const existing = await db.query(
        `SELECT id, quantity FROM cart_items 
         WHERE cognito_user_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))`,
        [userId, product_id, variant_id]
      );

      let result;
      if (existing.rows.length > 0) {
        // 数量を更新
        result = await db.query(
          `UPDATE cart_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
          [quantity, existing.rows[0].id]
        );
      } else {
        // 新規追加
        result = await db.query(
          `INSERT INTO cart_items (cognito_user_id, product_id, variant_id, quantity) 
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [userId, product_id, variant_id, quantity]
        );
      }
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/cart\/[\w-]+$/) && method === "PUT") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const { quantity } = parsedBody;

      const result = await db.query(
        `UPDATE cart_items SET quantity = $1, updated_at = NOW() 
         WHERE id = $2 AND cognito_user_id = $3 RETURNING *`,
        [quantity, id, userId]
      );
      if (result.rows.length === 0) return response(404, { error: "Cart item not found" });
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/cart\/[\w-]+$/) && method === "DELETE") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM cart_items WHERE id = $1 AND cognito_user_id = $2", [id, userId]);
      return response(200, { success: true });
    }

    if (path === "/v1/cart" && method === "DELETE") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      await db.query("DELETE FROM cart_items WHERE cognito_user_id = $1", [userId]);
      return response(200, { success: true });
    }

    // ==================== 注文 ====================
    if (path === "/v1/orders" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query(`
        SELECT o.*, json_agg(oi.*) as order_items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.cognito_user_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `, [userId]);
      return response(200, result.rows);
    }

    if (path === "/v1/orders" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { shipping_name, shipping_postal_code, shipping_address, shipping_phone } = parsedBody;

      // カートアイテムを取得
      const cartResult = await db.query(`
        SELECT ci.*, p.price, p.name as product_name
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cognito_user_id = $1
      `, [userId]);

      if (cartResult.rows.length === 0) {
        return response(400, { error: "カートが空です" });
      }

      // 合計金額を計算
      const totalAmount = cartResult.rows.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // 注文を作成
      const orderResult = await db.query(`
        INSERT INTO orders (cognito_user_id, total_amount, shipping_name, shipping_postal_code, shipping_address, shipping_phone)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      `, [userId, totalAmount, shipping_name, shipping_postal_code, shipping_address, shipping_phone]);

      const order = orderResult.rows[0];

      // 注文明細を作成
      for (const item of cartResult.rows) {
        await db.query(`
          INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
          VALUES ($1, $2, $3, $4, $5)
        `, [order.id, item.product_id, item.product_name, item.price, item.quantity]);
      }

      // カートをクリア
      await db.query("DELETE FROM cart_items WHERE cognito_user_id = $1", [userId]);

      return response(200, order);
    }

    // ==================== スタイリング ====================
    if (path === "/v1/styling" && method === "GET") {
      const result = await db.query(`
        SELECT s.*, json_agg(
          jsonb_build_object('id', si.id, 'styling_id', si.styling_id, 'url', si.url, 'display_order', si.display_order)
        ) FILTER (WHERE si.id IS NOT NULL) as styling_images
        FROM styling s
        LEFT JOIN styling_images si ON s.id = si.styling_id
        GROUP BY s.id
        ORDER BY s.display_order, s.created_at DESC
      `);
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/styling\/[\w-]+$/) && method === "GET") {
      const slug = path.split("/").pop();
      const result = await db.query(`
        SELECT s.*, json_agg(
          jsonb_build_object('id', si.id, 'styling_id', si.styling_id, 'url', si.url, 'display_order', si.display_order)
        ) FILTER (WHERE si.id IS NOT NULL) as styling_images
        FROM styling s
        LEFT JOIN styling_images si ON s.id = si.styling_id
        WHERE s.slug = $1
        GROUP BY s.id
      `, [slug]);
      if (result.rows.length === 0) return response(404, { error: "Styling not found" });
      return response(200, result.rows[0]);
    }

    // ==================== プロフィール ====================
    if (path === "/v1/profile" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query("SELECT * FROM profiles WHERE cognito_user_id = $1", [userId]);
      if (result.rows.length === 0) {
        // プロフィールが存在しない場合は作成
        const email = getUserEmail(event);
        const newProfile = await db.query(
          `INSERT INTO profiles (cognito_user_id, email) VALUES ($1, $2) RETURNING *`,
          [userId, email]
        );
        return response(200, newProfile.rows[0]);
      }
      return response(200, result.rows[0]);
    }

    if (path === "/v1/profile" && method === "PUT") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ["first_name", "last_name", "phone", "postal_code", "address", "gender", "birth_date", "full_name"];
      for (const field of allowedFields) {
        if (parsedBody[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          values.push(parsedBody[field]);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return response(400, { error: "更新するフィールドがありません" });
      }

      values.push(userId);
      const result = await db.query(
        `UPDATE profiles SET ${fields.join(", ")}, updated_at = NOW() WHERE cognito_user_id = $${paramIndex} RETURNING *`,
        values
      );
      return response(200, result.rows[0]);
    }

    // ==================== 管理者用API ====================
    if (path === "/v1/admin/orders" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const result = await db.query(`
        SELECT o.*, json_agg(oi.*) as order_items
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `);
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/admin\/orders\/[\w-]+\/status$/) && method === "PUT") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const pathParts = path.split("/");
      const id = pathParts[4];
      const parsedBody = JSON.parse(body || "{}");
      const { status } = parsedBody;

      const result = await db.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );
      if (result.rows.length === 0) return response(404, { error: "Order not found" });
      return response(200, result.rows[0]);
    }

    if (path === "/v1/admin/products" && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const parsedBody = JSON.parse(body || "{}");
      const { name, slug, description, price, image_url, category_id, category, stock, featured, display_order } = parsedBody;

      const result = await db.query(`
        INSERT INTO products (name, slug, description, price, image_url, category_id, category, stock, featured, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *
      `, [name, slug, description || "", price, image_url || "", category_id, category, stock || 0, featured || false, display_order || 0]);
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/products\/[\w-]+$/) && method === "PUT") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ["name", "slug", "description", "price", "image_url", "category_id", "category", "stock", "featured", "display_order"];
      for (const field of allowedFields) {
        if (parsedBody[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          values.push(parsedBody[field]);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return response(400, { error: "更新するフィールドがありません" });
      }

      values.push(id);
      const result = await db.query(
        `UPDATE products SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return response(404, { error: "Product not found" });
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/products\/[\w-]+$/) && method === "DELETE") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM products WHERE id = $1", [id]);
      return response(200, { success: true });
    }

    // ==================== ページビュー ====================
    if (path === "/v1/page-views" && method === "POST") {
      const parsedBody = JSON.parse(body || "{}");
      const { page_path, page_title, session_id } = parsedBody;

      await db.query(`
        INSERT INTO page_views (page_path, page_title, cognito_user_id, session_id)
        VALUES ($1, $2, $3, $4)
      `, [page_path, page_title, userId, session_id]);
      return response(200, { success: true });
    }

    // ==================== 管理者用 プロフィール一覧 ====================
    if (path === "/v1/admin/profiles" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const result = await db.query("SELECT * FROM profiles ORDER BY created_at DESC");
      return response(200, result.rows);
    }

    // ==================== 管理者用 スタイリングCRUD ====================
    if (path === "/v1/admin/styling" && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const parsedBody = JSON.parse(body || "{}");
      const { title, description, image_url, color, size, height, slug, display_order } = parsedBody;

      const result = await db.query(`
        INSERT INTO styling (title, description, image_url, color, size, height, slug, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [title || '', description || '', image_url || '', color || '', size || '', height || '', slug, display_order || 0]);
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/styling\/[\w-]+$/) && method === "PUT") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ["title", "description", "image_url", "color", "size", "height", "slug", "display_order"];
      for (const field of allowedFields) {
        if (parsedBody[field] !== undefined) {
          fields.push(`${field} = $${paramIndex}`);
          values.push(parsedBody[field]);
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return response(400, { error: "更新するフィールドがありません" });
      }

      values.push(id);
      const result = await db.query(
        `UPDATE styling SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return response(404, { error: "Styling not found" });
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/styling\/[\w-]+$/) && method === "DELETE") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM styling WHERE id = $1", [id]);
      return response(200, { success: true });
    }

    // ==================== 管理者用 商品バリエーション ====================
    if (path.match(/^\/v1\/admin\/products\/[\w-]+\/variants$/) && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const productId = path.split("/")[4];
      const result = await db.query("SELECT * FROM product_variants WHERE product_id = $1 ORDER BY size", [productId]);
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/admin\/products\/[\w-]+\/variants$/) && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const productId = path.split("/")[4];
      const parsedBody = JSON.parse(body || "{}");
      const { size, stock, sku } = parsedBody;

      const result = await db.query(`
        INSERT INTO product_variants (product_id, size, stock, sku)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [productId, size, stock || 0, sku]);
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/variants\/[\w-]+$/) && method === "PUT") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const { size, stock, sku } = parsedBody;

      const result = await db.query(`
        UPDATE product_variants SET size = COALESCE($1, size), stock = COALESCE($2, stock), sku = COALESCE($3, sku), updated_at = NOW()
        WHERE id = $4 RETURNING *
      `, [size, stock, sku, id]);
      if (result.rows.length === 0) return response(404, { error: "Variant not found" });
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/variants\/[\w-]+$/) && method === "DELETE") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM product_variants WHERE id = $1", [id]);
      return response(200, { success: true });
    }

    // ==================== 管理者用 商品画像 ====================
    if (path.match(/^\/v1\/admin\/products\/[\w-]+\/images$/) && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const productId = path.split("/")[4];
      const result = await db.query("SELECT * FROM product_images WHERE product_id = $1 ORDER BY display_order", [productId]);
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/admin\/products\/[\w-]+\/images$/) && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const productId = path.split("/")[4];
      const parsedBody = JSON.parse(body || "{}");
      const { url, display_order } = parsedBody;

      const result = await db.query(`
        INSERT INTO product_images (product_id, url, display_order)
        VALUES ($1, $2, $3) RETURNING *
      `, [productId, url, display_order || 1]);
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/images\/[\w-]+$/) && method === "DELETE") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM product_images WHERE id = $1", [id]);
      return response(200, { success: true });
    }

    // ==================== 管理者用 スタイリング画像 ====================
    if (path.match(/^\/v1\/admin\/styling\/[\w-]+\/images$/) && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const stylingId = path.split("/")[4];
      const result = await db.query("SELECT * FROM styling_images WHERE styling_id = $1 ORDER BY display_order", [stylingId]);
      return response(200, result.rows);
    }

    if (path.match(/^\/v1\/admin\/styling\/[\w-]+\/images$/) && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const stylingId = path.split("/")[4];
      const parsedBody = JSON.parse(body || "{}");
      const { url, display_order } = parsedBody;

      const result = await db.query(`
        INSERT INTO styling_images (styling_id, url, display_order)
        VALUES ($1, $2, $3) RETURNING *
      `, [stylingId, url, display_order || 1]);
      return response(200, result.rows[0]);
    }

    if (path.match(/^\/v1\/admin\/styling-images\/[\w-]+$/) && method === "DELETE") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM styling_images WHERE id = $1", [id]);
      return response(200, { success: true });
    }

    // ==================== 管理者用 分析データ ====================
    if (path === "/v1/admin/analytics/page-views" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const days = parseInt(queryParams.days || "30");
      const result = await db.query(`
        SELECT 
          DATE(created_at) as date,
          page_path,
          COUNT(*) as views,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at), page_path
        ORDER BY date DESC, views DESC
      `);
      return response(200, result.rows);
    }

    if (path === "/v1/admin/analytics/summary" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const result = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '30 days') as total_page_views,
          (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= NOW() - INTERVAL '30 days') as unique_visitors,
          (SELECT COUNT(*) FROM orders) as total_orders,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders) as total_revenue,
          (SELECT COUNT(*) FROM products) as total_products,
          (SELECT COUNT(*) FROM profiles) as total_users
      `);
      return response(200, result.rows[0]);
    }

    // ==================== 管理者用 ユーザー作成 ====================
    if (path === "/v1/admin/users" && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const parsedBody = JSON.parse(body || "{}");
      const { email, is_admin, full_name } = parsedBody;
      
      // プロフィールのみ作成（Cognitoユーザーは別途作成が必要）
      const result = await db.query(`
        INSERT INTO profiles (cognito_user_id, email, is_admin, full_name)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [`pending-${Date.now()}`, email, is_admin || false, full_name || '']);
      
      return response(200, { success: true, user: result.rows[0] });
    }

    if (path.match(/^\/v1\/admin\/profiles\/[\w-]+\/admin$/) && method === "PUT") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/")[4];
      const parsedBody = JSON.parse(body || "{}");
      const { is_admin } = parsedBody;

      const result = await db.query(
        `UPDATE profiles SET is_admin = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [is_admin, id]
      );
      if (result.rows.length === 0) return response(404, { error: "Profile not found" });
      return response(200, result.rows[0]);
    }

    // ==================== S3 署名付きURL生成 ====================
    if (path === "/v1/admin/upload-url" && method === "POST") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const parsedBody = JSON.parse(body || "{}");
      const { filename, contentType, folder } = parsedBody;
      
      if (!filename || !contentType) {
        return response(400, { error: "filename and contentType are required" });
      }
      
      // ファイル名を生成（UUID + 元のファイル名）
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const ext = filename.split('.').pop();
      const key = `${folder || 'uploads'}/${timestamp}-${randomId}.${ext}`;
      
      try {
        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: contentType,
        });
        
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const publicUrl = `https://${S3_BUCKET}.s3.ap-northeast-1.amazonaws.com/${key}`;
        
        return response(200, {
          uploadUrl,
          publicUrl,
          key,
        });
      } catch (error) {
        console.error("Error generating presigned URL:", error);
        return response(500, { error: "Failed to generate upload URL" });
      }
    }

    return response(404, { error: "Not found", path, method });

  } catch (error) {
    console.error("Error:", error);
    return response(500, { error: error.message || "Internal server error" });
  }
};
