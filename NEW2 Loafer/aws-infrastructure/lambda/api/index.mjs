import pg from "pg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Stripe from "stripe";

const { Pool } = pg;

// Stripe初期化
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" })
  : null;

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
      headers: event.headers || {},
    };
  }
  
  // REST API (v1) / 直接呼び出し形式
  return {
    path: event.path || "",
    method: event.httpMethod || "GET",
    body: event.body,
    queryParams: event.queryStringParameters || {},
    headers: event.headers || {},
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
  const { path, method, body, queryParams, headers } = getRequestInfo(event);
  
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

    if (path.match(/^\/v1\/products\/[^\/]+$/) && method === "GET") {
      const slugOrName = decodeURIComponent(path.split("/").pop());
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
        WHERE p.slug = $1 OR p.name = $1 OR p.id::text = $1
        GROUP BY p.id
      `, [slugOrName]);
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
      const { page_path, page_title, session_id, referrer } = parsedBody;

      await db.query(`
        INSERT INTO page_views (page_path, page_title, cognito_user_id, session_id, referrer)
        VALUES ($1, $2, $3, $4, $5)
      `, [page_path, page_title, userId, session_id, referrer || 'direct']);
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

    // ==================== 生データエクスポート ====================
    if (path === "/v1/admin/analytics/raw-data" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const days = parseInt(queryParams.days || "30");
      
      // ページビュー生データ
      const pageViewsRaw = await db.query(`
        SELECT 
          pv.created_at as "日時",
          pv.page_path as "ページパス",
          pv.page_title as "ページ名",
          CASE 
            WHEN pv.page_path LIKE '/shop/%' THEN REPLACE(pv.page_path, '/shop/', '')
            ELSE NULL 
          END as "商品スラッグ",
          p.name as "商品名",
          COALESCE(pv.referrer, 'direct') as "流入元",
          pv.session_id as "セッションID",
          CASE WHEN pv.cognito_user_id IS NOT NULL THEN '会員' ELSE '非会員' END as "会員区分"
        FROM page_views pv
        LEFT JOIN products p ON pv.page_path = '/shop/' || p.slug
        WHERE pv.created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY pv.created_at DESC
      `);
      
      // カート追加生データ
      const cartRaw = await db.query(`
        SELECT 
          ci.created_at as "日時",
          'カート追加' as "アクション",
          p.name as "商品名",
          pv.size as "サイズ",
          pv.sku as "SKU",
          ci.quantity as "数量",
          p.price as "単価",
          pr.email as "ユーザー"
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        LEFT JOIN profiles pr ON ci.cognito_user_id = pr.cognito_user_id
        WHERE ci.created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY ci.created_at DESC
      `);
      
      // 注文生データ
      const ordersRaw = await db.query(`
        SELECT 
          o.created_at as "日時",
          o.id as "注文ID",
          o.status as "ステータス",
          oi.product_name as "商品名",
          '' as "サイズ",
          oi.quantity as "数量",
          oi.product_price as "単価",
          (oi.quantity * oi.product_price) as "小計",
          o.total_amount as "注文合計",
          pr.email as "ユーザー"
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        LEFT JOIN profiles pr ON o.cognito_user_id = pr.cognito_user_id
        WHERE o.created_at >= NOW() - INTERVAL '${days} days'
        ORDER BY o.created_at DESC
      `);
      
      return response(200, {
        pageViews: pageViewsRaw.rows,
        cartItems: cartRaw.rows,
        orders: ordersRaw.rows,
      });
    }

    if (path === "/v1/admin/analytics/summary" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const days = parseInt(queryParams.days || "30");
      const result = await db.query(`
        SELECT 
          (SELECT COUNT(*) FROM page_views WHERE created_at >= NOW() - INTERVAL '${days} days') as total_page_views,
          (SELECT COUNT(DISTINCT session_id) FROM page_views WHERE created_at >= NOW() - INTERVAL '${days} days') as unique_visitors,
          (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '${days} days') as total_orders,
          (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE created_at >= NOW() - INTERVAL '${days} days') as total_revenue,
          (SELECT COUNT(*) FROM products) as total_products,
          (SELECT COUNT(*) FROM profiles) as total_users,
          (SELECT COUNT(*) FROM cart_items WHERE created_at >= NOW() - INTERVAL '${days} days') as cart_additions
      `);
      return response(200, result.rows[0]);
    }

    // ==================== 流入元別統計 ====================
    if (path === "/v1/admin/analytics/referrers" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const days = parseInt(queryParams.days || "30");
      const result = await db.query(`
        SELECT 
          COALESCE(referrer, 'direct') as referrer,
          COUNT(*) as views,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY COALESCE(referrer, 'direct')
        ORDER BY views DESC
      `);
      return response(200, result.rows);
    }

    // ==================== 商品別統計 ====================
    if (path === "/v1/admin/analytics/products" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const days = parseInt(queryParams.days || "30");
      const result = await db.query(`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          COALESCE(cart_stats.cart_additions, 0) as cart_additions,
          COALESCE(cart_stats.unique_cart_users, 0) as unique_cart_users,
          COALESCE(order_stats.purchases, 0) as purchases,
          COALESCE(order_stats.unique_purchasers, 0) as unique_purchasers,
          COALESCE(order_stats.revenue, 0) as revenue
        FROM products p
        LEFT JOIN (
          SELECT 
            ci.product_id,
            COUNT(*) as cart_additions,
            COUNT(DISTINCT ci.cognito_user_id) as unique_cart_users
          FROM cart_items ci
          WHERE ci.created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY ci.product_id
        ) cart_stats ON p.id = cart_stats.product_id
        LEFT JOIN (
          SELECT 
            oi.product_id,
            SUM(oi.quantity) as purchases,
            COUNT(DISTINCT o.cognito_user_id) as unique_purchasers,
            SUM(oi.quantity * oi.product_price) as revenue
          FROM order_items oi
          JOIN orders o ON oi.order_id = o.id
          WHERE o.created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY oi.product_id
        ) order_stats ON p.id = order_stats.product_id
        ORDER BY cart_stats.cart_additions DESC NULLS LAST
      `);
      return response(200, result.rows);
    }

    // ==================== スタイリング別統計 ====================
    if (path === "/v1/admin/analytics/styling" && method === "GET") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const days = parseInt(queryParams.days || "30");
      const result = await db.query(`
        SELECT 
          s.id as styling_id,
          s.title as styling_title,
          s.image_url,
          COALESCE(pv_stats.views, 0) as views,
          COALESCE(pv_stats.unique_sessions, 0) as unique_sessions,
          COALESCE(pv_stats.logged_in_users, 0) as logged_in_users,
          COALESCE(pv_stats.anonymous_users, 0) as anonymous_users
        FROM styling s
        LEFT JOIN (
          SELECT 
            REPLACE(page_path, '/styling/', '') as slug,
            COUNT(*) as views,
            COUNT(DISTINCT session_id) as unique_sessions,
            COUNT(DISTINCT CASE WHEN cognito_user_id IS NOT NULL THEN session_id END) as logged_in_users,
            COUNT(DISTINCT CASE WHEN cognito_user_id IS NULL THEN session_id END) as anonymous_users
          FROM page_views
          WHERE page_path LIKE '/styling/%'
            AND created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY REPLACE(page_path, '/styling/', '')
        ) pv_stats ON s.slug = pv_stats.slug
        ORDER BY pv_stats.views DESC NULLS LAST
      `);
      return response(200, result.rows);
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

    // ==================== ユーザー削除 ====================
    if (path.match(/^\/v1\/admin\/profiles\/[\w-]+$/) && method === "DELETE") {
      if (!userId || !(await isAdmin(db, userId))) {
        return response(403, { error: "管理者権限が必要です" });
      }
      
      const id = path.split("/")[4];
      
      // 自分自身は削除できない
      const profile = await db.query("SELECT cognito_user_id FROM profiles WHERE id = $1", [id]);
      if (profile.rows.length > 0 && profile.rows[0].cognito_user_id === userId) {
        return response(400, { error: "自分自身は削除できません" });
      }
      
      const result = await db.query("DELETE FROM profiles WHERE id = $1 RETURNING *", [id]);
      if (result.rows.length === 0) return response(404, { error: "Profile not found" });
      return response(200, { message: "User deleted successfully" });
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
        const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "d8l6v2r98r1en.cloudfront.net";
        const publicUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`;
        
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

    // ==================== Stripe チェックアウト ====================
    if (path === "/v1/checkout/create-session" && method === "POST") {
      if (!stripe) {
        return response(500, { error: "Stripe is not configured" });
      }
      if (!userId) {
        return response(401, { error: "認証が必要です" });
      }

      // ユーザーのメールアドレスを取得
      const userEmail = getUserEmail(event);

      // カートから商品情報を取得
      const cartResult = await db.query(`
        SELECT ci.*, p.name as product_name, p.price, p.image_url, pv.size as variant_size
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.cognito_user_id = $1
      `, [userId]);

      if (cartResult.rows.length === 0) {
        return response(400, { error: "カートが空です" });
      }

      // Stripeのline_itemsを作成（unit_amountは整数である必要がある）
      const lineItems = cartResult.rows.map(item => ({
        price_data: {
          currency: 'jpy',
          product_data: {
            name: item.product_name,
            description: item.variant_size ? `サイズ: ${item.variant_size}` : undefined,
            images: item.image_url ? [item.image_url] : undefined,
          },
          unit_amount: Math.round(parseFloat(item.price)),
        },
        quantity: item.quantity,
      }));

      // チェックアウトセッションを作成
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.STRIPE_SUCCESS_URL || 'https://main.d3o5fndieuvuu2.amplifyapp.com/checkout/success'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: process.env.STRIPE_CANCEL_URL || 'https://main.d3o5fndieuvuu2.amplifyapp.com/cart',
        customer_email: userEmail,
        metadata: {
          user_id: userId,
        },
        shipping_address_collection: {
          allowed_countries: ['JP'],
        },
        shipping_options: [
          {
            shipping_rate_data: {
              type: 'fixed_amount',
              fixed_amount: {
                amount: 0,
                currency: 'jpy',
              },
              display_name: '通常配送（送料無料）',
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 3 },
                maximum: { unit: 'business_day', value: 7 },
              },
            },
          },
        ],
        locale: 'ja',
      });

      return response(200, { 
        sessionId: session.id,
        url: session.url 
      });
    }

    // ==================== Stripe セッション取得 ====================
    const sessionMatch = path.match(/^\/v1\/checkout\/session\/([^\/]+)$/);
    if (sessionMatch && method === "GET") {
      if (!stripe) {
        return response(500, { error: "Stripe is not configured" });
      }
      
      const sessionId = sessionMatch[1];
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items', 'shipping_details'],
        });
        
        return response(200, {
          status: session.payment_status,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total,
          shippingDetails: session.shipping_details,
        });
      } catch (error) {
        return response(404, { error: 'Session not found' });
      }
    }

    // ==================== Stripe Webhook ====================
    if (path === "/v1/webhook/stripe" && method === "POST") {
      if (!stripe) {
        return response(500, { error: "Stripe is not configured" });
      }

      const sig = headers['stripe-signature'];
      let event;

      try {
        event = stripe.webhooks.constructEvent(
          body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return response(400, { error: 'Webhook signature verification failed' });
      }

      // イベント処理
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const metaUserId = session.metadata.user_id;
          
          // 重複チェック
          const existingOrder = await db.query(
            'SELECT id FROM orders WHERE stripe_session_id = $1',
            [session.id]
          );
          if (existingOrder.rows.length > 0) {
            console.log('Order already exists for session:', session.id);
            break;
          }

          // カートから商品情報を取得
          const cartResult = await db.query(`
            SELECT ci.*, p.name as product_name, p.price, pv.size as variant_size
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN product_variants pv ON ci.variant_id = pv.id
            WHERE ci.cognito_user_id = $1
          `, [metaUserId]);

          if (cartResult.rows.length === 0) {
            console.error('Cart is empty for user:', metaUserId);
            break;
          }

          // 注文を作成
          const totalAmount = cartResult.rows.reduce(
            (sum, item) => sum + (item.price * item.quantity), 0
          );

          const orderResult = await db.query(`
            INSERT INTO orders (cognito_user_id, total_amount, status, stripe_session_id)
            VALUES ($1, $2, 'paid', $3)
            RETURNING id
          `, [metaUserId, totalAmount, session.id]);

          const orderId = orderResult.rows[0].id;

          // 注文明細を作成
          for (const item of cartResult.rows) {
            await db.query(`
              INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
              VALUES ($1, $2, $3, $4, $5)
            `, [orderId, item.product_id, item.product_name, item.price, item.quantity]);

            // 在庫を減らす
            if (item.variant_id) {
              await db.query(`
                UPDATE product_variants 
                SET stock = stock - $1 
                WHERE id = $2
              `, [item.quantity, item.variant_id]);
            }
          }

          // カートをクリア
          await db.query(`
            DELETE FROM cart_items WHERE cognito_user_id = $1
          `, [metaUserId]);

          console.log('Order created successfully:', orderId);
          break;
        }
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          console.error('Payment failed:', paymentIntent.last_payment_error?.message);
          break;
        }
      }

      return response(200, { received: true });
    }

    // ==================== WARDROBE アイテム ====================
    // 一覧取得
    if (path === "/v1/wardrobe/items" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query(`
        SELECT * FROM wardrobe_items 
        WHERE cognito_user_id = $1 
        ORDER BY created_at DESC
      `, [userId]);
      return response(200, result.rows);
    }

    // 作成
    if (path === "/v1/wardrobe/items" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { 
        name, brand, size, size_details, color, category,
        purchase_date, purchase_price, currency, purchase_location,
        source_url, image_url, image_url_2, image_url_3, notes, is_from_shop
      } = parsedBody;

      const result = await db.query(`
        INSERT INTO wardrobe_items (
          cognito_user_id, name, brand, size, size_details, color, category,
          purchase_date, purchase_price, currency, purchase_location,
          source_url, image_url, image_url_2, image_url_3, notes, is_from_shop
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        userId, name, brand, size, size_details ? JSON.stringify(size_details) : null, 
        color, category, purchase_date, purchase_price, currency || 'JPY', 
        purchase_location, source_url, image_url, image_url_2, image_url_3, notes, is_from_shop || false
      ]);
      return response(200, result.rows[0]);
    }

    // 更新
    if (path.match(/^\/v1\/wardrobe\/items\/[\w-]+$/) && method === "PUT") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = [
        "name", "brand", "size", "size_details", "color", "category",
        "purchase_date", "purchase_price", "currency", "purchase_location",
        "source_url", "image_url", "image_url_2", "image_url_3", "notes",
        "is_discarded", "discarded_at", "is_sold", "sold_date", "sold_price", "sold_currency", "sold_location"
      ];
      
      for (const field of allowedFields) {
        if (parsedBody[field] !== undefined) {
          if (field === "size_details") {
            fields.push(`${field} = $${paramIndex}`);
            values.push(JSON.stringify(parsedBody[field]));
          } else {
            fields.push(`${field} = $${paramIndex}`);
            values.push(parsedBody[field]);
          }
          paramIndex++;
        }
      }

      if (fields.length === 0) {
        return response(400, { error: "更新するフィールドがありません" });
      }

      values.push(id);
      values.push(userId);
      const result = await db.query(
        `UPDATE wardrobe_items SET ${fields.join(", ")}, updated_at = NOW() 
         WHERE id = $${paramIndex} AND cognito_user_id = $${paramIndex + 1} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return response(404, { error: "Item not found" });
      return response(200, result.rows[0]);
    }

    // 削除
    if (path.match(/^\/v1\/wardrobe\/items\/[\w-]+$/) && method === "DELETE") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM wardrobe_items WHERE id = $1 AND cognito_user_id = $2", [id, userId]);
      return response(200, { success: true });
    }

    // ==================== WARDROBE スタイリング写真 ====================
    // 一覧取得
    if (path === "/v1/wardrobe/styling-photos" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query(`
        SELECT sp.*, 
          json_agg(
            jsonb_build_object('id', wsi.id, 'wardrobe_item_id', wsi.wardrobe_item_id, 'item', row_to_json(wi))
          ) FILTER (WHERE wsi.id IS NOT NULL) as worn_items
        FROM wardrobe_styling_photos sp
        LEFT JOIN wardrobe_styling_items wsi ON sp.id = wsi.styling_photo_id
        LEFT JOIN wardrobe_items wi ON wsi.wardrobe_item_id = wi.id
        WHERE sp.cognito_user_id = $1
        GROUP BY sp.id
        ORDER BY sp.created_at DESC
      `, [userId]);
      return response(200, result.rows);
    }

    // 作成
    if (path === "/v1/wardrobe/styling-photos" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { image_url, title, notes, worn_item_ids } = parsedBody;

      const photoResult = await db.query(`
        INSERT INTO wardrobe_styling_photos (cognito_user_id, image_url, title, notes)
        VALUES ($1, $2, $3, $4) RETURNING *
      `, [userId, image_url, title, notes]);

      const photo = photoResult.rows[0];

      // 関連アイテムを追加
      if (worn_item_ids && worn_item_ids.length > 0) {
        for (const itemId of worn_item_ids) {
          await db.query(`
            INSERT INTO wardrobe_styling_items (styling_photo_id, wardrobe_item_id)
            VALUES ($1, $2)
          `, [photo.id, itemId]);
        }
      }

      return response(200, photo);
    }

    // 削除
    if (path.match(/^\/v1\/wardrobe\/styling-photos\/[\w-]+$/) && method === "DELETE") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM wardrobe_styling_photos WHERE id = $1 AND cognito_user_id = $2", [id, userId]);
      return response(200, { success: true });
    }

    // ==================== 足の測定 ====================
    // 一覧取得
    if (path === "/v1/wardrobe/foot-measurements" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query(`
        SELECT * FROM foot_measurements 
        WHERE cognito_user_id = $1 
        ORDER BY measurement_date DESC
      `, [userId]);
      return response(200, result.rows);
    }

    // 作成
    if (path === "/v1/wardrobe/foot-measurements" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { foot_type, length_mm, width_mm, arch_height_mm, instep_height_mm, scan_image_url } = parsedBody;

      const result = await db.query(`
        INSERT INTO foot_measurements (cognito_user_id, foot_type, length_mm, width_mm, arch_height_mm, instep_height_mm, scan_image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [userId, foot_type, length_mm, width_mm, arch_height_mm, instep_height_mm, scan_image_url]);
      return response(200, result.rows[0]);
    }

    // 更新 (is_active)
    if (path.match(/^\/v1\/wardrobe\/foot-measurements\/[\w-]+$/) && method === "PUT") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const { is_active } = parsedBody;

      const result = await db.query(`
        UPDATE foot_measurements SET is_active = $1 
        WHERE id = $2 AND cognito_user_id = $3 RETURNING *
      `, [is_active, id, userId]);
      if (result.rows.length === 0) return response(404, { error: "Measurement not found" });
      return response(200, result.rows[0]);
    }

    // 削除
    if (path.match(/^\/v1\/wardrobe\/foot-measurements\/[\w-]+$/) && method === "DELETE") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM foot_measurements WHERE id = $1 AND cognito_user_id = $2", [id, userId]);
      return response(200, { success: true });
    }

    // ==================== ブランドサイズマッピング ====================
    // 一覧取得
    if (path === "/v1/wardrobe/brand-size-mappings" && method === "GET") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const result = await db.query(`
        SELECT * FROM brand_size_mappings 
        WHERE cognito_user_id = $1 
        ORDER BY created_at DESC
      `, [userId]);
      return response(200, result.rows);
    }

    // 作成
    if (path === "/v1/wardrobe/brand-size-mappings" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { brand_name, size, size_system, numeric_size, fit_rating, comfort_rating, notes } = parsedBody;

      const result = await db.query(`
        INSERT INTO brand_size_mappings (cognito_user_id, brand_name, size, size_system, numeric_size, fit_rating, comfort_rating, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
      `, [userId, brand_name, size, size_system, numeric_size, fit_rating || 3, comfort_rating || 3, notes]);
      return response(200, result.rows[0]);
    }

    // 更新
    if (path.match(/^\/v1\/wardrobe\/brand-size-mappings\/[\w-]+$/) && method === "PUT") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      const parsedBody = JSON.parse(body || "{}");
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = ["brand_name", "size", "size_system", "numeric_size", "fit_rating", "comfort_rating", "notes"];
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
      values.push(userId);
      const result = await db.query(
        `UPDATE brand_size_mappings SET ${fields.join(", ")} 
         WHERE id = $${paramIndex} AND cognito_user_id = $${paramIndex + 1} RETURNING *`,
        values
      );
      if (result.rows.length === 0) return response(404, { error: "Mapping not found" });
      return response(200, result.rows[0]);
    }

    // 削除
    if (path.match(/^\/v1\/wardrobe\/brand-size-mappings\/[\w-]+$/) && method === "DELETE") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const id = path.split("/").pop();
      await db.query("DELETE FROM brand_size_mappings WHERE id = $1 AND cognito_user_id = $2", [id, userId]);
      return response(200, { success: true });
    }

    // ==================== WARDROBE 画像アップロード用URL ====================
    if (path === "/v1/wardrobe/upload-url" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { filename, contentType } = parsedBody;
      
      if (!filename || !contentType) {
        return response(400, { error: "filename and contentType are required" });
      }
      
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const ext = filename.split('.').pop();
      const key = `wardrobe/${userId}/${timestamp}-${randomId}.${ext}`;
      
      try {
        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: contentType,
        });
        
        const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "d8l6v2r98r1en.cloudfront.net";
        const publicUrl = `https://${CLOUDFRONT_DOMAIN}/${key}`;
        
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

    // ==================== WARDROBE 商品URLスクレイピング (Gemini API) ====================
    if (path === "/v1/wardrobe/scrape-url" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { url } = parsedBody;
      
      if (!url) {
        return response(400, { error: "url is required" });
      }
      
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        // Gemini API未設定の場合はURLからドメイン名を抽出してモックデータを返す
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '').split('.')[0];
        return response(200, {
          name: 'URLから取得した商品',
          brand: domain.charAt(0).toUpperCase() + domain.slice(1),
          price: '',
          currency: 'JPY',
          description: `${url} から取得（Gemini API未設定）`,
          source_url: url,
        });
      }
      
      try {
        console.log("Scraping URL:", url);
        
        // URLのページ内容を取得
        const pageRes = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
          },
        });
        console.log("Page fetch status:", pageRes.status);
        const html = await pageRes.text();
        console.log("HTML length:", html.length);
        
        // HTMLから画像URLを抽出
        const imageUrls = [];
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let match;
        while ((match = imgRegex.exec(html)) !== null && imageUrls.length < 20) {
          let imgSrc = match[1];
          // 相対URLを絶対URLに変換
          if (imgSrc.startsWith('//')) {
            imgSrc = 'https:' + imgSrc;
          } else if (imgSrc.startsWith('/')) {
            const urlObj = new URL(url);
            imgSrc = urlObj.origin + imgSrc;
          } else if (!imgSrc.startsWith('http')) {
            const urlObj = new URL(url);
            imgSrc = urlObj.origin + '/' + imgSrc;
          }
          // 小さいアイコンやトラッキング画像を除外
          if (!imgSrc.includes('tracking') && !imgSrc.includes('pixel') && 
              !imgSrc.includes('.gif') && !imgSrc.includes('icon') &&
              !imgSrc.includes('logo') && !imgSrc.includes('badge')) {
            imageUrls.push(imgSrc);
          }
        }
        console.log("Found image URLs:", imageUrls.length);
        
        // HTMLから主要なテキストを抽出（簡略化）
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 8000); // Gemini APIへの入力を制限
        
        // Gemini APIで商品情報を抽出
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `以下のウェブページから商品情報を抽出してJSON形式で返してください。
商品が見つからない場合は空のオブジェクトを返してください。

【抽出する情報】
- name: 商品名（ブランド名＋モデル名など、正式な商品名）
- brand: ブランド名
- price: 価格（数字のみ、カンマなし）
- currency: 通貨コード（JPY, USD, EUR等）
- category: 商品カテゴリー（以下から最も適切なものを1つ選択）
  * "トップス" - Tシャツ、シャツ、ニット、パーカー、スウェット等
  * "アウター／ジャケット" - ジャケット、コート、ブルゾン、ダウン等
  * "パンツ" - ジーンズ、スラックス、ショートパンツ等
  * "その他（スーツ／ワンピース等）" - スーツ、ワンピース、セットアップ等
  * "バッグ" - バッグ、リュック、財布等
  * "シューズ" - スニーカー、革靴、ブーツ、サンダル等
  * "アクセサリー／小物" - 帽子、時計、ベルト、ネクタイ、マフラー等
- description: 商品詳細（以下の情報をできるだけ多く含めて300文字程度で記載）
  * 素材・生地情報
  * デザインの特徴
  * サイズ感・フィット感
  * 製造国
  * シーズン・年式
  * 特記事項（限定品、コラボ等）
- image_urls: 商品画像URL配列（下記リストから最も適切な商品画像を3枚選択。メイン画像を最初に）
- available_colors: 利用可能なカラーの配列。各要素は { "name": "カラー名", "code": "#HEX色コード（わかれば）", "image_url": "そのカラーの商品画像URL" }
- available_sizes: 利用可能なサイズの配列（例: ["S", "M", "L"] または ["25.0cm", "25.5cm", "26.0cm"]）

【ページ内で見つかった画像URL一覧】
${imageUrls.slice(0, 15).join('\n')}

【重要】
- image_urlsは上記リストから商品画像として適切なものを最大3枚選んでください
- categoryは上記7種類から必ず1つ選択してください
- descriptionは商品の特徴を詳しく記載してください
- JSONのみを返してください。説明文は不要です

【ウェブページ内容】
${textContent}

【URL】 ${url}`
                }]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 3000,
              }
            }),
          }
        );
        
        console.log("Gemini API status:", geminiRes.status);
        if (!geminiRes.ok) {
          const errorText = await geminiRes.text();
          console.error("Gemini API error response:", errorText);
          throw new Error('Gemini API error: ' + errorText.substring(0, 200));
        }
        
        const geminiData = await geminiRes.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        console.log("Gemini response text:", responseText.substring(0, 500));
        
        // JSONを抽出（マークダウンコードブロックを除去）
        let jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        console.log("Parsed JSON string:", jsonStr.substring(0, 300));
        const productData = JSON.parse(jsonStr);
        console.log("Product data parsed successfully");
        
        return response(200, {
          success: true,
          data: {
            ...productData,
            source_url: url,
          }
        });
        
      } catch (error) {
        console.error("Error scraping URL:", error);
        return response(500, { error: "商品情報の取得に失敗しました: " + error.message });
      }
    }

    // ==================== WARDROBE タグ画像からの情報抽出 (Gemini Vision) ====================
    if (path === "/v1/wardrobe/extract-tag" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { imageBase64 } = parsedBody;
      
      if (!imageBase64) {
        return response(400, { error: "imageBase64 is required" });
      }
      
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        return response(200, {
          brand: '不明',
          size: '',
          materials: '',
          care_instructions: '',
          message: 'Gemini API未設定のため、手動で入力してください',
        });
      }
      
      try {
        // Base64データからプレフィックスを除去
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `この衣類タグの画像から情報を抽出してJSON形式で返してください。

抽出する情報:
- brand: ブランド名
- size: サイズ（S, M, L, XL, 数値等）
- category: カテゴリー（トップス/アウター/パンツ/シューズ等）
- materials: 素材（例: 綿100%、ポリエステル80%綿20%）
- care_instructions: 洗濯表示（例: 手洗い、ドライクリーニング）
- color: 色（読み取れれば）
- made_in: 生産国（読み取れれば）

JSONのみを返してください。読み取れない項目は空文字にしてください。`
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
              }
            }),
          }
        );
        
        if (!geminiRes.ok) {
          throw new Error('Gemini API error');
        }
        
        const geminiData = await geminiRes.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        let jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const tagData = JSON.parse(jsonStr);
        
        return response(200, tagData);
        
      } catch (error) {
        console.error("Error extracting tag info:", error);
        return response(500, { error: "タグ情報の読み取りに失敗しました: " + error.message });
      }
    }

    // ==================== 商品画像分析 (Gemini Vision) ====================
    if (path === "/v1/wardrobe/analyze-image" && method === "POST") {
      if (!userId) return response(401, { error: "認証が必要です" });
      
      const parsedBody = JSON.parse(body || "{}");
      const { imageBase64 } = parsedBody;
      
      if (!imageBase64) {
        return response(400, { error: "imageBase64 is required" });
      }
      
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        return response(200, {
          name: '不明な商品',
          brand: null,
          category: 'シューズ',
          color: null,
          price: null,
          description: 'Gemini API未設定のため、手動で入力してください',
        });
      }
      
      try {
        // Base64データからプレフィックスを除去
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        
        console.log('📸 Analyzing product image with Gemini...');
        
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  {
                    text: `この商品画像を分析して、ワードローブに登録するための情報をJSON形式で返してください。

ネット上の商品データベースや知識を活用して、できるだけ正確な情報を提供してください。

抽出・推定する情報:
- name: 商品名（ブランド名 + モデル名。例: "Nike Air Max 90"）
- brand: ブランド名（Nike, Adidas, New Balance等）
- category: カテゴリー（以下から選択: トップス, アウター／ジャケット, パンツ, その他（スーツ／ワンピース等）, バッグ, シューズ, アクセサリー／小物）
- color: 色（例: ブラック/ホワイト, ネイビー）
- price: 推定価格（日本円、数字のみ。例: 15000）
- currency: 通貨（JPY）
- description: 商品の説明（素材、特徴など、50文字以内）

重要:
- 商品名は具体的なモデル名まで特定してください
- 価格は日本での一般的な販売価格を推定してください
- 不明な場合はnullを返してください

JSONのみを返してください。`
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Data
                    }
                  }
                ]
              }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 1024,
              }
            }),
          }
        );
        
        console.log('📡 Gemini response status:', geminiRes.status);
        
        if (!geminiRes.ok) {
          const errorText = await geminiRes.text();
          console.error('❌ Gemini API error:', errorText);
          throw new Error('Gemini API error: ' + errorText);
        }
        
        const geminiData = await geminiRes.json();
        const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        
        console.log('📝 Gemini response:', responseText);
        
        let jsonStr = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const productData = JSON.parse(jsonStr);
        
        console.log('✅ Product data extracted:', productData);
        
        return response(200, productData);
        
      } catch (error) {
        console.error("Error analyzing product image:", error);
        return response(500, { error: "商品画像の分析に失敗しました: " + error.message });
      }
    }

    return response(404, { error: "Not found", path, method });

  } catch (error) {
    console.error("Error:", error);
    return response(500, { error: error.message || "Internal server error" });
  }
};
