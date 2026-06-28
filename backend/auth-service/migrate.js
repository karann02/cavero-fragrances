const sequelize = require('./config/db');

async function runMigrations() {
  try {
    // Users table compatibility columns
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP;
    `);
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(255);
    `);
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP;
    `);
    await sequelize.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    `);

    // Cart table — track the selected variant so logged-in carts keep size + variant price
    await sequelize.query(`
      ALTER TABLE cart
      ADD COLUMN IF NOT EXISTS variant_id INTEGER,
      ADD COLUMN IF NOT EXISTS selected_size VARCHAR(255);
    `);

    // Addresses table — saved shipping/billing addresses on the profile page
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        label VARCHAR(255),
        street TEXT,
        city VARCHAR(255),
        state VARCHAR(255),
        zip_code VARCHAR(32),
        country VARCHAR(255) DEFAULT 'India',
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        type VARCHAR(32) NOT NULL DEFAULT 'shipping',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
    `);

    // Orders table compatibility columns (prevents payment-success/order-save failure)
    await sequelize.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10, 2),
      ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS shipping_address JSONB,
      ADD COLUMN IF NOT EXISTS billing_address JSONB,
      ADD COLUMN IF NOT EXISTS coupon_id INTEGER,
      ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255),
      ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(255),
      ADD COLUMN IF NOT EXISTS notes TEXT,
      ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0;
    `);

    await sequelize.query(`
      UPDATE orders
      SET final_amount = COALESCE(final_amount, total_amount, 0)
      WHERE final_amount IS NULL;
    `);

    // Normalize accidental duplicate Razorpay IDs on older data so unique indexes can be added safely.
    await sequelize.query(`
      WITH duplicate_payment_orders AS (
        SELECT
          id,
          ROW_NUMBER() OVER (PARTITION BY razorpay_payment_id ORDER BY id ASC) AS row_num
        FROM orders
        WHERE razorpay_payment_id IS NOT NULL AND razorpay_payment_id <> ''
      )
      UPDATE orders AS o
      SET razorpay_payment_id = NULL
      FROM duplicate_payment_orders AS d
      WHERE o.id = d.id AND d.row_num > 1;
    `);

    await sequelize.query(`
      WITH duplicate_razorpay_orders AS (
        SELECT
          id,
          ROW_NUMBER() OVER (PARTITION BY razorpay_order_id ORDER BY id ASC) AS row_num
        FROM orders
        WHERE razorpay_order_id IS NOT NULL AND razorpay_order_id <> ''
      )
      UPDATE orders AS o
      SET razorpay_order_id = NULL
      FROM duplicate_razorpay_orders AS d
      WHERE o.id = d.id AND d.row_num > 1;
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_payment_id_unique
      ON orders (razorpay_payment_id)
      WHERE razorpay_payment_id IS NOT NULL;
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS orders_razorpay_order_id_unique
      ON orders (razorpay_order_id)
      WHERE razorpay_order_id IS NOT NULL;
    `);

    // Combos table compatibility columns for predefined combo validity
    await sequelize.query(`
      ALTER TABLE combos
      ADD COLUMN IF NOT EXISTS valid_from DATE,
      ADD COLUMN IF NOT EXISTS valid_to DATE,
      ADD COLUMN IF NOT EXISTS image VARCHAR(500);
    `);

    // Coupons table compatibility columns for usage-limit-only coupons
    await sequelize.query(`
      ALTER TABLE coupons
      ALTER COLUMN valid_from DROP NOT NULL,
      ALTER COLUMN valid_until DROP NOT NULL;
    `);

    // Clear existing dates for usage-limit-only coupons
    await sequelize.query(`
      UPDATE coupons
      SET valid_from = NULL,
          valid_until = NULL
      WHERE usage_limit IS NOT NULL;
    `);

    // Sliders table compatibility columns for device visibility targeting
    await sequelize.query(`
      ALTER TABLE sliders
      ADD COLUMN IF NOT EXISTS display_on VARCHAR(20) DEFAULT 'all';
    `);

    // Influencer reels popup/product-detail compatibility columns
    await sequelize.query(`
      ALTER TABLE influencer_reels
      ADD COLUMN IF NOT EXISTS product_description TEXT,
      ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(1000),
      ADD COLUMN IF NOT EXISTS product_detail_url VARCHAR(1000);
    `);

    // Backfill display_on from legacy screen_type when available
    const [screenTypeColumn] = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'sliders' AND COLUMN_NAME = 'screen_type';
    `);
    if (screenTypeColumn.length > 0) {
      await sequelize.query(`
        UPDATE sliders
        SET display_on = CASE
          WHEN display_on IS NULL OR display_on = '' THEN COALESCE(screen_type, 'all')
          ELSE display_on
        END;
      `);
    }

    // Normalize values to allowed set
    await sequelize.query(`
      UPDATE sliders
      SET display_on = 'all'
      WHERE display_on NOT IN ('all', 'desktop', 'mobile') OR display_on IS NULL OR display_on = '';
    `);

    // Add check constraint for display_on if it doesn't exist
    try {
      await sequelize.query(`
        ALTER TABLE sliders
        DROP CONSTRAINT IF EXISTS sliders_screen_type_check;
      `);
    } catch (err) {
      console.log('Note: Could not drop legacy sliders_screen_type_check constraint:', err.message);
    }

    try {
      await sequelize.query(`
        ALTER TABLE sliders
        DROP CONSTRAINT IF EXISTS sliders_display_on_check;
      `);
      await sequelize.query(`
        ALTER TABLE sliders
        ADD CONSTRAINT sliders_display_on_check
        CHECK (display_on IN ('all', 'desktop', 'mobile'));
      `);
    } catch (err) {
      console.log('Note: Could not add display_on constraint:', err.message);
    }

    // Add return_requested to orders order_status ENUM (safe — DO $$ block is idempotent)
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumlabel = 'return_requested'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_orders_order_status')
        ) THEN
          ALTER TYPE enum_orders_order_status ADD VALUE 'return_requested';
        END IF;
      END
      $$;
    `);

    // Remove hospital system leftovers
    await sequelize.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS hospital_id;
    `);

    // Referral program — add referral_code to users
    await sequelize.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20);
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_unique ON users (referral_code) WHERE referral_code IS NOT NULL;
    `);

    // Variant stock tracking — selected_size on order_items
    await sequelize.query(`
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS selected_size VARCHAR(50) DEFAULT NULL;
    `);

    // Product variants — dedicated relational table (replaces specifications.sizes JSONB approach)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        name VARCHAR(100) NOT NULL,
        sku VARCHAR(100),
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        compare_price DECIMAL(10,2),
        stock INTEGER NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER NOT NULL DEFAULT 5,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id)
          REFERENCES products(id) ON DELETE CASCADE
      );
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
    `);
    // variant_id FK on order_items — links each sold item to the exact variant purchased
    await sequelize.query(`
      ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id INTEGER DEFAULT NULL;
    `);

    // Variant types — master list of predefined size options (3ml, 6ml, 30ml, 100ml, etc.)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS variant_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    console.log('Migration complete: users/reviews/orders/combos/sliders/influencer reels/referrals/order_items/product_variants/variant_types table columns ensured');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

module.exports = runMigrations;
