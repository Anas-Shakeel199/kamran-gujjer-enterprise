use serde::{Deserialize, Serialize};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePool},
    Row,
};
use tauri::{AppHandle, Manager};

// =====================================================
// DATABASE HELPER
// =====================================================

async fn get_database(app: &AppHandle) -> Result<SqlitePool, String> {
    let app_config_dir = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;

    std::fs::create_dir_all(&app_config_dir)
        .map_err(|error| error.to_string())?;

    let db_path = app_config_dir.join("app.db");

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);

    SqlitePool::connect_with(options)
        .await
        .map_err(|error| format!("Database connection failed: {}", error))
}

// =====================================================
// INITIALIZE DATABASE
// =====================================================

async fn initialize_database(pool: &SqlitePool) -> Result<(), String> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_number TEXT NOT NULL UNIQUE,
            purchase_date TEXT NOT NULL,
            supplier_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity REAL NOT NULL,
            rate_per_kg REAL NOT NULL,
            total_amount REAL NOT NULL,
            payment_status TEXT NOT NULL,
            paid_amount REAL NOT NULL DEFAULT 0,
            remaining_amount REAL NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create purchases table: {}", error))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_number TEXT NOT NULL UNIQUE,
            sale_date TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity REAL NOT NULL,
            rate_per_kg REAL NOT NULL,
            total_amount REAL NOT NULL,
            payment_status TEXT NOT NULL,
            paid_amount REAL NOT NULL DEFAULT 0,
            remaining_amount REAL NOT NULL DEFAULT 0,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create sales table: {}", error))?;

    let _ = sqlx::query("ALTER TABLE purchases ADD COLUMN factory TEXT NOT NULL DEFAULT ''").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE purchases ADD COLUMN bundle_count REAL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE purchases ADD COLUMN tar_size TEXT").execute(pool).await;

    let _ = sqlx::query("ALTER TABLE sales ADD COLUMN factory TEXT NOT NULL DEFAULT ''").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE sales ADD COLUMN bundle_count REAL").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE sales ADD COLUMN tar_size TEXT").execute(pool).await;

    // ---------------------------------------------
    // PARTIES TABLE (now factory-scoped: same phone
    // number can have a separate khata per factory)
    // ---------------------------------------------
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS parties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone_number TEXT NOT NULL,
            party_type TEXT NOT NULL,
            factory TEXT NOT NULL DEFAULT '',
            address TEXT,
            opening_balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(phone_number, party_type, factory)
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create parties table: {}", error))?;

    // ---------------------------------------------
    // PAYMENTS TABLE (now factory-scoped too)
    // ---------------------------------------------
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT NOT NULL,
            party_type TEXT NOT NULL,
            factory TEXT NOT NULL DEFAULT '',
            amount REAL NOT NULL,
            payment_date TEXT NOT NULL,
            payment_method TEXT,
            reference TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create payments table: {}", error))?;

    let _ = sqlx::query("ALTER TABLE payments ADD COLUMN factory TEXT NOT NULL DEFAULT ''").execute(pool).await;
    let _ = sqlx::query("ALTER TABLE payments ADD COLUMN reference TEXT").execute(pool).await;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS expense_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create expense_categories table: {}", error))?;

sqlx::query(
    r#"
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        payment_method TEXT NOT NULL,
        notes TEXT,
        factory TEXT NOT NULL DEFAULT 'Main Factory',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    "#,
)
.execute(pool)
.await
.map_err(|error| format!("Could not create expenses table: {}", error))?;

    for default_category in [
        "Labour", "Transport", "Loading", "Electricity", "Repair", "Fuel", "Office Expense", "Other",
    ] {
        sqlx::query("INSERT OR IGNORE INTO expense_categories (name) VALUES (?1)")
            .bind(default_category)
            .execute(pool)
            .await
            .map_err(|error| error.to_string())?;
    }

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            factory_name TEXT NOT NULL DEFAULT 'Kamran Gujjer Enterprise',
            factory_phone TEXT NOT NULL DEFAULT '',
            factory_address TEXT NOT NULL DEFAULT ''
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create app_settings table: {}", error))?;

    sqlx::query(
        "INSERT OR IGNORE INTO app_settings (id, factory_name, factory_phone, factory_address) VALUES (1, 'Kamran Gujjer Enterprise', '', '')",
    )
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS maal_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create maal_categories table: {}", error))?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS payment_methods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create payment_methods table: {}", error))?;

    for default_method in ["Cash", "Bank Transfer", "Cheque", "Other"] {
        sqlx::query("INSERT OR IGNORE INTO payment_methods (name) VALUES (?1)")
            .bind(default_method)
            .execute(pool)
            .await
            .map_err(|error| error.to_string())?;
    }

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS factories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| format!("Could not create factories table: {}", error))?;

    sqlx::query(
        r#"
        INSERT OR IGNORE INTO users
            (username, password_hash, role)
        VALUES
            (
                'admin',
                '$argon2id$v=19$m=65536,t=3,p=4$ePkzkxd4lObFs7dKlwao3A$7scwn+Iafjafmt8ONnIh+vZ35KkOH8IdPWJhu6B2kKo',
                'admin'
            );
        "#,
    )
    .execute(pool)
    .await
    .map_err(|error| error.to_string())?;

    Ok(())
}

// =====================================================
// GREET / HASH / LOGIN
// =====================================================

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn hash_password(password: &str) -> Result<String, String> {
    use argon2::{
        password_hash::{PasswordHasher, SaltString},
        Argon2,
    };
    use rand_core::OsRng;

    let salt = SaltString::generate(&mut OsRng);

    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|error| error.to_string())
}

#[derive(Serialize)]
struct LoggedInUser {
    id: i64,
    username: String,
    role: String,
}

#[tauri::command]
async fn login(app: AppHandle, username: String, password: String) -> Result<LoggedInUser, String> {
    use argon2::{
        password_hash::{PasswordHash, PasswordVerifier},
        Argon2,
    };

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let row = sqlx::query("SELECT id, username, password_hash, role FROM users WHERE username = ?1")
        .bind(username.trim())
        .fetch_optional(&pool)
        .await
        .map_err(|error| format!("Database query failed: {}", error))?
        .ok_or_else(|| "Invalid username or password".to_string())?;

    let id: i64 = row.try_get("id").map_err(|e| e.to_string())?;
    let db_username: String = row.try_get("username").map_err(|e| e.to_string())?;
    let password_hash: String = row.try_get("password_hash").map_err(|e| e.to_string())?;
    let role: String = row.try_get("role").map_err(|e| e.to_string())?;

    let parsed_hash = PasswordHash::new(&password_hash).map_err(|e| e.to_string())?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| "Invalid username or password".to_string())?;

    Ok(LoggedInUser { id, username: db_username, role })
}

// =====================================================
// PARTY HELPER (now factory-aware)
// =====================================================

async fn upsert_party(pool: &SqlitePool, name: &str, phone: &str, party_type: &str, factory: &str) -> Result<(), String> {
    sqlx::query("INSERT OR IGNORE INTO parties (name, phone_number, party_type, factory, opening_balance) VALUES (?1, ?2, ?3, ?4, 0)")
        .bind(name)
        .bind(phone)
        .bind(party_type)
        .bind(factory)
        .execute(pool)
        .await
        .map_err(|error| error.to_string())?;

    Ok(())
}

// =====================================================
// PURCHASE TYPES
// =====================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePurchaseInput {
    purchase_date: String,
    supplier_name: String,
    phone_number: String,
    factory: String,
    category: String,
    quantity: f64,
    rate_per_kg: f64,
    bundle_count: Option<f64>,
    tar_size: Option<String>,
    payment_status: String,
    paid_amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Purchase {
    id: i64,
    bill_number: String,
    purchase_date: String,
    supplier_name: String,
    phone_number: String,
    factory: String,
    category: String,
    quantity: f64,
    rate_per_kg: f64,
    bundle_count: Option<f64>,
    tar_size: Option<String>,
    total_amount: f64,
    payment_status: String,
    paid_amount: f64,
    remaining_amount: f64,
    notes: Option<String>,
    created_at: String,
}

fn row_to_purchase(row: &sqlx::sqlite::SqliteRow) -> Result<Purchase, String> {
    Ok(Purchase {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        bill_number: row.try_get("bill_number").map_err(|e| e.to_string())?,
        purchase_date: row.try_get("purchase_date").map_err(|e| e.to_string())?,
        supplier_name: row.try_get("supplier_name").map_err(|e| e.to_string())?,
        phone_number: row.try_get("phone_number").map_err(|e| e.to_string())?,
        factory: row.try_get("factory").map_err(|e| e.to_string())?,
        category: row.try_get("category").map_err(|e| e.to_string())?,
        quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
        rate_per_kg: row.try_get("rate_per_kg").map_err(|e| e.to_string())?,
        bundle_count: row.try_get("bundle_count").map_err(|e| e.to_string())?,
        tar_size: row.try_get("tar_size").map_err(|e| e.to_string())?,
        total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
        payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
        paid_amount: row.try_get("paid_amount").map_err(|e| e.to_string())?,
        remaining_amount: row.try_get("remaining_amount").map_err(|e| e.to_string())?,
        notes: row.try_get("notes").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    })
}

const PURCHASE_SELECT_COLUMNS: &str = "id, bill_number, purchase_date, supplier_name, phone_number, factory, category, quantity, rate_per_kg, bundle_count, tar_size, total_amount, payment_status, paid_amount, remaining_amount, notes, created_at";

async fn generate_bill_number(pool: &SqlitePool) -> Result<String, String> {
    let row = sqlx::query("SELECT COUNT(*) as count FROM purchases")
        .fetch_one(pool)
        .await
        .map_err(|error| error.to_string())?;
    let count: i64 = row.try_get("count").map_err(|error| error.to_string())?;
    Ok(format!("BILL-{:04}", count + 1))
}

#[tauri::command]
async fn create_purchase(app: AppHandle, purchase: CreatePurchaseInput) -> Result<Purchase, String> {
    if purchase.supplier_name.trim().is_empty() { return Err("Supplier name required hai.".to_string()); }
    if purchase.phone_number.trim().is_empty() { return Err("Phone number required hai.".to_string()); }
    if purchase.factory.trim().is_empty() { return Err("Factory select karein.".to_string()); }
    if purchase.category.trim().is_empty() { return Err("Maal category required hai.".to_string()); }
    if purchase.quantity <= 0.0 { return Err("Quantity 0 se zyada honi chahiye.".to_string()); }
    if purchase.rate_per_kg <= 0.0 { return Err("Rate 0 se zyada hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    upsert_party(&pool, purchase.supplier_name.trim(), purchase.phone_number.trim(), "supplier", purchase.factory.trim()).await?;

    let total_amount = purchase.quantity * purchase.rate_per_kg;
    let mut paid_amount = purchase.paid_amount;
    if paid_amount < 0.0 { paid_amount = 0.0; }
    if paid_amount > total_amount { return Err("Paid amount total amount se zyada nahi ho sakta.".to_string()); }
    let remaining_amount = total_amount - paid_amount;

    let payment_status = match purchase.payment_status.as_str() {
        "Paid" => { if paid_amount < total_amount { return Err("Paid status ke liye full amount enter karein.".to_string()); } "Paid" }
        "Partial" => { if paid_amount <= 0.0 || paid_amount >= total_amount { return Err("Partial payment ke liye paid amount valid hona chahiye.".to_string()); } "Partial" }
        "Unpaid" => { if paid_amount > 0.0 { return Err("Unpaid status ke liye paid amount 0 hona chahiye.".to_string()); } "Unpaid" }
        _ => return Err("Invalid payment status.".to_string()),
    };

    let bill_number = generate_bill_number(&pool).await?;

    let result = sqlx::query(
        r#"
        INSERT INTO purchases (
            bill_number, purchase_date, supplier_name, phone_number, factory,
            category, quantity, rate_per_kg, bundle_count, tar_size, total_amount,
            payment_status, paid_amount, remaining_amount, notes
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        "#,
    )
    .bind(&bill_number)
    .bind(&purchase.purchase_date)
    .bind(purchase.supplier_name.trim())
    .bind(purchase.phone_number.trim())
    .bind(purchase.factory.trim())
    .bind(purchase.category.trim())
    .bind(purchase.quantity)
    .bind(purchase.rate_per_kg)
    .bind(purchase.bundle_count)
    .bind(&purchase.tar_size)
    .bind(total_amount)
    .bind(payment_status)
    .bind(paid_amount)
    .bind(remaining_amount)
    .bind(&purchase.notes)
    .execute(&pool)
    .await
    .map_err(|error| format!("Purchase save nahi ho saki: {}", error))?;

    let purchase_id = result.last_insert_rowid();

    let row = sqlx::query(&format!("SELECT {} FROM purchases WHERE id = ?1", PURCHASE_SELECT_COLUMNS))
        .bind(purchase_id)
        .fetch_one(&pool)
        .await
        .map_err(|error| error.to_string())?;

    row_to_purchase(&row)
}

#[tauri::command]
async fn get_purchases(app: AppHandle) -> Result<Vec<Purchase>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query(&format!("SELECT {} FROM purchases ORDER BY id DESC", PURCHASE_SELECT_COLUMNS))
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Purchases load nahi ho sakin: {}", error))?;

    rows.iter().map(row_to_purchase).collect::<Result<Vec<_>, String>>()
}

#[tauri::command]
async fn update_purchase(app: AppHandle, id: i64, purchase: CreatePurchaseInput) -> Result<Purchase, String> {
    if purchase.supplier_name.trim().is_empty() { return Err("Supplier name required hai.".to_string()); }
    if purchase.phone_number.trim().is_empty() { return Err("Phone number required hai.".to_string()); }
    if purchase.factory.trim().is_empty() { return Err("Factory select karein.".to_string()); }
    if purchase.category.trim().is_empty() { return Err("Maal category required hai.".to_string()); }
    if purchase.quantity <= 0.0 { return Err("Quantity 0 se zyada honi chahiye.".to_string()); }
    if purchase.rate_per_kg <= 0.0 { return Err("Rate 0 se zyada hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    upsert_party(&pool, purchase.supplier_name.trim(), purchase.phone_number.trim(), "supplier", purchase.factory.trim()).await?;

    let total_amount = purchase.quantity * purchase.rate_per_kg;
    let mut paid_amount = purchase.paid_amount;
    if paid_amount < 0.0 { paid_amount = 0.0; }
    if paid_amount > total_amount { return Err("Paid amount total amount se zyada nahi ho sakta.".to_string()); }
    let remaining_amount = total_amount - paid_amount;

    let payment_status = match purchase.payment_status.as_str() {
        "Paid" => { if paid_amount < total_amount { return Err("Paid status ke liye full amount enter karein.".to_string()); } "Paid" }
        "Partial" => { if paid_amount <= 0.0 || paid_amount >= total_amount { return Err("Partial payment ke liye paid amount valid hona chahiye.".to_string()); } "Partial" }
        "Unpaid" => { if paid_amount > 0.0 { return Err("Unpaid status ke liye paid amount 0 hona chahiye.".to_string()); } "Unpaid" }
        _ => return Err("Invalid payment status.".to_string()),
    };

    let result = sqlx::query(
        r#"
        UPDATE purchases SET
            purchase_date = ?1, supplier_name = ?2, phone_number = ?3, factory = ?4,
            category = ?5, quantity = ?6, rate_per_kg = ?7, bundle_count = ?8, tar_size = ?9,
            total_amount = ?10, payment_status = ?11, paid_amount = ?12, remaining_amount = ?13, notes = ?14
        WHERE id = ?15
        "#,
    )
    .bind(&purchase.purchase_date)
    .bind(purchase.supplier_name.trim())
    .bind(purchase.phone_number.trim())
    .bind(purchase.factory.trim())
    .bind(purchase.category.trim())
    .bind(purchase.quantity)
    .bind(purchase.rate_per_kg)
    .bind(purchase.bundle_count)
    .bind(&purchase.tar_size)
    .bind(total_amount)
    .bind(payment_status)
    .bind(paid_amount)
    .bind(remaining_amount)
    .bind(&purchase.notes)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Purchase update nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Purchase record nahi mila.".to_string()); }

    let row = sqlx::query(&format!("SELECT {} FROM purchases WHERE id = ?1", PURCHASE_SELECT_COLUMNS))
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|error| error.to_string())?;

    row_to_purchase(&row)
}

#[tauri::command]
async fn delete_purchase(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("DELETE FROM purchases WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Purchase delete nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Purchase record nahi mila.".to_string()); }
    Ok(())
}

// =====================================================
// STOCK HELPER
// =====================================================

async fn get_available_stock_kg(pool: &SqlitePool) -> Result<f64, String> {
    let purchased_row = sqlx::query("SELECT COALESCE(SUM(quantity), 0.0) as total FROM purchases")
        .fetch_one(pool)
        .await
        .map_err(|error| error.to_string())?;
    let sold_row = sqlx::query("SELECT COALESCE(SUM(quantity), 0.0) as total FROM sales")
        .fetch_one(pool)
        .await
        .map_err(|error| error.to_string())?;
    let purchased: f64 = purchased_row.try_get("total").map_err(|error| error.to_string())?;
    let sold: f64 = sold_row.try_get("total").map_err(|error| error.to_string())?;
    Ok(purchased - sold)
}

// =====================================================
// SALE TYPES
// =====================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateSaleInput {
    sale_date: String,
    customer_name: String,
    phone_number: String,
    factory: String,
    category: String,
    quantity: f64,
    rate_per_kg: f64,
    bundle_count: Option<f64>,
    tar_size: Option<String>,
    payment_status: String,
    paid_amount: f64,
    notes: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Sale {
    id: i64,
    bill_number: String,
    sale_date: String,
    customer_name: String,
    phone_number: String,
    factory: String,
    category: String,
    quantity: f64,
    rate_per_kg: f64,
    bundle_count: Option<f64>,
    tar_size: Option<String>,
    total_amount: f64,
    payment_status: String,
    paid_amount: f64,
    remaining_amount: f64,
    notes: Option<String>,
    created_at: String,
}

fn row_to_sale(row: &sqlx::sqlite::SqliteRow) -> Result<Sale, String> {
    Ok(Sale {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        bill_number: row.try_get("bill_number").map_err(|e| e.to_string())?,
        sale_date: row.try_get("sale_date").map_err(|e| e.to_string())?,
        customer_name: row.try_get("customer_name").map_err(|e| e.to_string())?,
        phone_number: row.try_get("phone_number").map_err(|e| e.to_string())?,
        factory: row.try_get("factory").map_err(|e| e.to_string())?,
        category: row.try_get("category").map_err(|e| e.to_string())?,
        quantity: row.try_get("quantity").map_err(|e| e.to_string())?,
        rate_per_kg: row.try_get("rate_per_kg").map_err(|e| e.to_string())?,
        bundle_count: row.try_get("bundle_count").map_err(|e| e.to_string())?,
        tar_size: row.try_get("tar_size").map_err(|e| e.to_string())?,
        total_amount: row.try_get("total_amount").map_err(|e| e.to_string())?,
        payment_status: row.try_get("payment_status").map_err(|e| e.to_string())?,
        paid_amount: row.try_get("paid_amount").map_err(|e| e.to_string())?,
        remaining_amount: row.try_get("remaining_amount").map_err(|e| e.to_string())?,
        notes: row.try_get("notes").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    })
}

const SALE_SELECT_COLUMNS: &str = "id, bill_number, sale_date, customer_name, phone_number, factory, category, quantity, rate_per_kg, bundle_count, tar_size, total_amount, payment_status, paid_amount, remaining_amount, notes, created_at";

async fn generate_sale_bill_number(pool: &SqlitePool) -> Result<String, String> {
    let row = sqlx::query("SELECT COUNT(*) as count FROM sales")
        .fetch_one(pool)
        .await
        .map_err(|error| error.to_string())?;
    let count: i64 = row.try_get("count").map_err(|error| error.to_string())?;
    Ok(format!("SALE-{:04}", count + 1))
}

#[tauri::command]
async fn create_sale(app: AppHandle, sale: CreateSaleInput) -> Result<Sale, String> {
    if sale.customer_name.trim().is_empty() { return Err("Customer name required hai.".to_string()); }
    if sale.phone_number.trim().is_empty() { return Err("Phone number required hai.".to_string()); }
    if sale.factory.trim().is_empty() { return Err("Factory select karein.".to_string()); }
    if sale.category.trim().is_empty() { return Err("Maal category required hai.".to_string()); }
    if sale.quantity <= 0.0 { return Err("Quantity 0 se zyada honi chahiye.".to_string()); }
    if sale.rate_per_kg <= 0.0 { return Err("Rate 0 se zyada hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    upsert_party(&pool, sale.customer_name.trim(), sale.phone_number.trim(), "customer", sale.factory.trim()).await?;

    let available_stock = get_available_stock_kg(&pool).await?;
    if sale.quantity > available_stock {
        return Err(format!("Stock kam hai. Sirf {:.2} KG available hai.", available_stock));
    }

    let total_amount = sale.quantity * sale.rate_per_kg;
    let mut paid_amount = sale.paid_amount;
    if paid_amount < 0.0 { paid_amount = 0.0; }
    if paid_amount > total_amount { return Err("Paid amount total amount se zyada nahi ho sakta.".to_string()); }
    let remaining_amount = total_amount - paid_amount;

    let payment_status = match sale.payment_status.as_str() {
        "Paid" => { if paid_amount < total_amount { return Err("Paid status ke liye full amount enter karein.".to_string()); } "Paid" }
        "Partial" => { if paid_amount <= 0.0 || paid_amount >= total_amount { return Err("Partial payment ke liye paid amount valid hona chahiye.".to_string()); } "Partial" }
        "Unpaid" => { if paid_amount > 0.0 { return Err("Unpaid status ke liye paid amount 0 hona chahiye.".to_string()); } "Unpaid" }
        _ => return Err("Invalid payment status.".to_string()),
    };

    let bill_number = generate_sale_bill_number(&pool).await?;

    let result = sqlx::query(
        r#"
        INSERT INTO sales (
            bill_number, sale_date, customer_name, phone_number, factory,
            category, quantity, rate_per_kg, bundle_count, tar_size, total_amount,
            payment_status, paid_amount, remaining_amount, notes
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        "#,
    )
    .bind(&bill_number)
    .bind(&sale.sale_date)
    .bind(sale.customer_name.trim())
    .bind(sale.phone_number.trim())
    .bind(sale.factory.trim())
    .bind(sale.category.trim())
    .bind(sale.quantity)
    .bind(sale.rate_per_kg)
    .bind(sale.bundle_count)
    .bind(&sale.tar_size)
    .bind(total_amount)
    .bind(payment_status)
    .bind(paid_amount)
    .bind(remaining_amount)
    .bind(&sale.notes)
    .execute(&pool)
    .await
    .map_err(|error| format!("Sale save nahi ho saki: {}", error))?;

    let sale_id = result.last_insert_rowid();

    let row = sqlx::query(&format!("SELECT {} FROM sales WHERE id = ?1", SALE_SELECT_COLUMNS))
        .bind(sale_id)
        .fetch_one(&pool)
        .await
        .map_err(|error| error.to_string())?;

    row_to_sale(&row)
}

#[tauri::command]
async fn get_sales(app: AppHandle) -> Result<Vec<Sale>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query(&format!("SELECT {} FROM sales ORDER BY id DESC", SALE_SELECT_COLUMNS))
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Sales load nahi ho sakin: {}", error))?;

    rows.iter().map(row_to_sale).collect::<Result<Vec<_>, String>>()
}

#[tauri::command]
async fn update_sale(app: AppHandle, id: i64, sale: CreateSaleInput) -> Result<Sale, String> {
    if sale.customer_name.trim().is_empty() { return Err("Customer name required hai.".to_string()); }
    if sale.phone_number.trim().is_empty() { return Err("Phone number required hai.".to_string()); }
    if sale.factory.trim().is_empty() { return Err("Factory select karein.".to_string()); }
    if sale.category.trim().is_empty() { return Err("Maal category required hai.".to_string()); }
    if sale.quantity <= 0.0 { return Err("Quantity 0 se zyada honi chahiye.".to_string()); }
    if sale.rate_per_kg <= 0.0 { return Err("Rate 0 se zyada hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    upsert_party(&pool, sale.customer_name.trim(), sale.phone_number.trim(), "customer", sale.factory.trim()).await?;

    let old_row = sqlx::query("SELECT quantity FROM sales WHERE id = ?1")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Sale record nahi mila.".to_string())?;

    let old_quantity: f64 = old_row.try_get("quantity").map_err(|e| e.to_string())?;

    let current_available = get_available_stock_kg(&pool).await?;
    let available_for_this_edit = current_available + old_quantity;

    if sale.quantity > available_for_this_edit {
        return Err(format!("Stock kam hai. Sirf {:.2} KG available hai.", available_for_this_edit));
    }

    let total_amount = sale.quantity * sale.rate_per_kg;
    let mut paid_amount = sale.paid_amount;
    if paid_amount < 0.0 { paid_amount = 0.0; }
    if paid_amount > total_amount { return Err("Paid amount total amount se zyada nahi ho sakta.".to_string()); }
    let remaining_amount = total_amount - paid_amount;

    let payment_status = match sale.payment_status.as_str() {
        "Paid" => { if paid_amount < total_amount { return Err("Paid status ke liye full amount enter karein.".to_string()); } "Paid" }
        "Partial" => { if paid_amount <= 0.0 || paid_amount >= total_amount { return Err("Partial payment ke liye paid amount valid hona chahiye.".to_string()); } "Partial" }
        "Unpaid" => { if paid_amount > 0.0 { return Err("Unpaid status ke liye paid amount 0 hona chahiye.".to_string()); } "Unpaid" }
        _ => return Err("Invalid payment status.".to_string()),
    };

    let result = sqlx::query(
        r#"
        UPDATE sales SET
            sale_date = ?1, customer_name = ?2, phone_number = ?3, factory = ?4,
            category = ?5, quantity = ?6, rate_per_kg = ?7, bundle_count = ?8, tar_size = ?9,
            total_amount = ?10, payment_status = ?11, paid_amount = ?12, remaining_amount = ?13, notes = ?14
        WHERE id = ?15
        "#,
    )
    .bind(&sale.sale_date)
    .bind(sale.customer_name.trim())
    .bind(sale.phone_number.trim())
    .bind(sale.factory.trim())
    .bind(sale.category.trim())
    .bind(sale.quantity)
    .bind(sale.rate_per_kg)
    .bind(sale.bundle_count)
    .bind(&sale.tar_size)
    .bind(total_amount)
    .bind(payment_status)
    .bind(paid_amount)
    .bind(remaining_amount)
    .bind(&sale.notes)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Sale update nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Sale record nahi mila.".to_string()); }

    let row = sqlx::query(&format!("SELECT {} FROM sales WHERE id = ?1", SALE_SELECT_COLUMNS))
        .bind(id)
        .fetch_one(&pool)
        .await
        .map_err(|error| error.to_string())?;

    row_to_sale(&row)
}

#[tauri::command]
async fn delete_sale(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("DELETE FROM sales WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Sale delete nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Sale record nahi mila.".to_string()); }
    Ok(())
}

// =====================================================
// PARTY / KHATA TYPES (factory-scoped)
// =====================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Party {
    id: i64,
    name: String,
    phone_number: String,
    party_type: String,
    factory: String,
    address: Option<String>,
    opening_balance: f64,
    created_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PartySummary {
    id: i64,
    name: String,
    phone_number: String,
    party_type: String,
    factory: String,
    address: Option<String>,
    opening_balance: f64,
    total_business: f64,
    total_payments: f64,
    balance: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct LedgerEntry {
    date: String,
    detail: String,
    debit: f64,
    credit: f64,
    balance: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PartyLedgerResponse {
    party: PartySummary,
    entries: Vec<LedgerEntry>,
}

#[tauri::command]
async fn get_parties(app: AppHandle, party_type: String, factory: String) -> Result<Vec<PartySummary>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let party_rows = sqlx::query(
        "SELECT id, name, phone_number, address, opening_balance FROM parties WHERE party_type = ?1 AND factory = ?2 ORDER BY name ASC",
    )
    .bind(&party_type)
    .bind(&factory)
    .fetch_all(&pool)
    .await
    .map_err(|error| error.to_string())?;

    let mut summaries = Vec::new();

    for row in party_rows {
        let id: i64 = row.try_get("id").map_err(|e| e.to_string())?;
        let name: String = row.try_get("name").map_err(|e| e.to_string())?;
        let phone_number: String = row.try_get("phone_number").map_err(|e| e.to_string())?;
        let address: Option<String> = row.try_get("address").map_err(|e| e.to_string())?;
        let opening_balance: f64 = row.try_get("opening_balance").map_err(|e| e.to_string())?;

        let business_table = if party_type == "supplier" { "purchases" } else { "sales" };

        let business_query = format!("SELECT COALESCE(SUM(total_amount), 0.0) as total FROM {} WHERE phone_number = ?1 AND factory = ?2", business_table);
        let business_row = sqlx::query(&business_query).bind(&phone_number).bind(&factory).fetch_one(&pool).await.map_err(|e| e.to_string())?;
        let total_business: f64 = business_row.try_get("total").map_err(|e| e.to_string())?;

        let paid_query = format!("SELECT COALESCE(SUM(paid_amount), 0.0) as total FROM {} WHERE phone_number = ?1 AND factory = ?2", business_table);
        let paid_row = sqlx::query(&paid_query).bind(&phone_number).bind(&factory).fetch_one(&pool).await.map_err(|e| e.to_string())?;
        let total_paid_at_creation: f64 = paid_row.try_get("total").map_err(|e| e.to_string())?;

        let extra_payments_row = sqlx::query("SELECT COALESCE(SUM(amount), 0.0) as total FROM payments WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
            .bind(&phone_number)
            .bind(&party_type)
            .bind(&factory)
            .fetch_one(&pool)
            .await
            .map_err(|e| e.to_string())?;
        let extra_payments: f64 = extra_payments_row.try_get("total").map_err(|e| e.to_string())?;

        let total_payments = total_paid_at_creation + extra_payments;
        let balance = opening_balance + total_business - total_payments;

        summaries.push(PartySummary {
            id, name, phone_number, party_type: party_type.clone(), factory: factory.clone(), address, opening_balance,
            total_business, total_payments, balance,
        });
    }

    Ok(summaries)
}

#[tauri::command]
async fn get_party_ledger(app: AppHandle, phone_number: String, party_type: String, factory: String) -> Result<PartyLedgerResponse, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let party_row = sqlx::query("SELECT id, name, address, opening_balance FROM parties WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
        .bind(&phone_number)
        .bind(&party_type)
        .bind(&factory)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Party nahi mili.".to_string())?;

    let id: i64 = party_row.try_get("id").map_err(|e| e.to_string())?;
    let name: String = party_row.try_get("name").map_err(|e| e.to_string())?;
    let address: Option<String> = party_row.try_get("address").map_err(|e| e.to_string())?;
    let opening_balance: f64 = party_row.try_get("opening_balance").map_err(|e| e.to_string())?;

    struct RawEntry { date: String, detail: String, debit: f64, credit: f64, order_key: i64 }
    let mut raw: Vec<RawEntry> = Vec::new();

    if party_type == "supplier" {
        let rows = sqlx::query("SELECT id, bill_number, purchase_date, total_amount, paid_amount FROM purchases WHERE phone_number = ?1 AND factory = ?2 ORDER BY id ASC")
            .bind(&phone_number)
            .bind(&factory)
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string())?;

        for row in rows {
            let rid: i64 = row.try_get("id").map_err(|e| e.to_string())?;
            let bill_number: String = row.try_get("bill_number").map_err(|e| e.to_string())?;
            let date: String = row.try_get("purchase_date").map_err(|e| e.to_string())?;
            let total_amount: f64 = row.try_get("total_amount").map_err(|e| e.to_string())?;
            let paid_amount: f64 = row.try_get("paid_amount").map_err(|e| e.to_string())?;

            raw.push(RawEntry { date: date.clone(), detail: format!("Purchase {}", bill_number), debit: total_amount, credit: 0.0, order_key: rid * 10 });
            if paid_amount > 0.0 {
                raw.push(RawEntry { date, detail: format!("Payment on {}", bill_number), debit: 0.0, credit: paid_amount, order_key: rid * 10 + 1 });
            }
        }
    } else {
        let rows = sqlx::query("SELECT id, bill_number, sale_date, total_amount, paid_amount FROM sales WHERE phone_number = ?1 AND factory = ?2 ORDER BY id ASC")
            .bind(&phone_number)
            .bind(&factory)
            .fetch_all(&pool)
            .await
            .map_err(|e| e.to_string())?;

        for row in rows {
            let rid: i64 = row.try_get("id").map_err(|e| e.to_string())?;
            let bill_number: String = row.try_get("bill_number").map_err(|e| e.to_string())?;
            let date: String = row.try_get("sale_date").map_err(|e| e.to_string())?;
            let total_amount: f64 = row.try_get("total_amount").map_err(|e| e.to_string())?;
            let paid_amount: f64 = row.try_get("paid_amount").map_err(|e| e.to_string())?;

            raw.push(RawEntry { date: date.clone(), detail: format!("Sale {}", bill_number), debit: total_amount, credit: 0.0, order_key: rid * 10 });
            if paid_amount > 0.0 {
                raw.push(RawEntry { date, detail: format!("Payment on {}", bill_number), debit: 0.0, credit: paid_amount, order_key: rid * 10 + 1 });
            }
        }
    }

    let payment_rows = sqlx::query("SELECT id, amount, payment_date, payment_method FROM payments WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3 ORDER BY id ASC")
        .bind(&phone_number)
        .bind(&party_type)
        .bind(&factory)
        .fetch_all(&pool)
        .await
        .map_err(|e| e.to_string())?;

    for row in payment_rows {
        let rid: i64 = row.try_get("id").map_err(|e| e.to_string())?;
        let amount: f64 = row.try_get("amount").map_err(|e| e.to_string())?;
        let date: String = row.try_get("payment_date").map_err(|e| e.to_string())?;
        let method: Option<String> = row.try_get("payment_method").map_err(|e| e.to_string())?;

        let detail = match method {
            Some(m) if !m.trim().is_empty() => format!("Payment ({})", m),
            _ => "Payment".to_string(),
        };

        raw.push(RawEntry { date, detail, debit: 0.0, credit: amount, order_key: 1_000_000_000 + rid });
    }

    raw.sort_by(|a, b| a.date.cmp(&b.date).then(a.order_key.cmp(&b.order_key)));

    let mut entries: Vec<LedgerEntry> = Vec::new();
    let mut balance = opening_balance;

    entries.push(LedgerEntry {
        date: "Opening".to_string(),
        detail: "Opening Balance".to_string(),
        debit: if opening_balance > 0.0 { opening_balance } else { 0.0 },
        credit: if opening_balance < 0.0 { -opening_balance } else { 0.0 },
        balance,
    });

    let mut total_debit = 0.0;
    let mut total_credit = 0.0;

    for entry in raw {
        balance += entry.debit - entry.credit;
        total_debit += entry.debit;
        total_credit += entry.credit;
        entries.push(LedgerEntry { date: entry.date, detail: entry.detail, debit: entry.debit, credit: entry.credit, balance });
    }

    let party = PartySummary {
        id, name, phone_number, party_type, factory, address, opening_balance,
        total_business: total_debit, total_payments: total_credit, balance,
    };

    Ok(PartyLedgerResponse { party, entries })
}

// =====================================================
// PAYMENTS (factory-scoped)
// =====================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreatePaymentInput {
    phone_number: String,
    party_type: String,
    factory: String,
    amount: f64,
    payment_date: String,
    payment_method: Option<String>,
    reference: Option<String>,
    notes: Option<String>,
}

#[tauri::command]
async fn create_payment(app: AppHandle, payment: CreatePaymentInput) -> Result<(), String> {
    if payment.amount <= 0.0 { return Err("Amount 0 se zyada hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let exists = sqlx::query("SELECT id FROM parties WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
        .bind(&payment.phone_number)
        .bind(&payment.party_type)
        .bind(&payment.factory)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if exists.is_none() {
        return Err("Party nahi mili. Pehle Khata mein party add karein.".to_string());
    }

    sqlx::query(
        "INSERT INTO payments (phone_number, party_type, factory, amount, payment_date, payment_method, reference, notes) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
    )
    .bind(&payment.phone_number)
    .bind(&payment.party_type)
    .bind(&payment.factory)
    .bind(payment.amount)
    .bind(&payment.payment_date)
    .bind(&payment.payment_method)
    .bind(&payment.reference)
    .bind(&payment.notes)
    .execute(&pool)
    .await
    .map_err(|error| format!("Payment save nahi ho saka: {}", error))?;

    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentRecord {
    id: i64,
    phone_number: String,
    party_type: String,
    factory: String,
    party_name: String,
    amount: f64,
    payment_date: String,
    payment_method: Option<String>,
    reference: Option<String>,
    notes: Option<String>,
    created_at: String,
}

#[tauri::command]
async fn get_payments(app: AppHandle) -> Result<Vec<PaymentRecord>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query(
        r#"
        SELECT p.id, p.phone_number, p.party_type, p.factory, COALESCE(pa.name, 'Unknown') as party_name,
               p.amount, p.payment_date, p.payment_method, p.reference, p.notes, p.created_at
        FROM payments p
        LEFT JOIN parties pa ON pa.phone_number = p.phone_number AND pa.party_type = p.party_type AND pa.factory = p.factory
        ORDER BY p.payment_date DESC, p.id DESC
        "#,
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Payments load nahi ho sakin: {}", error))?;

    let payments = rows
        .into_iter()
        .map(|row| {
            Ok(PaymentRecord {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                phone_number: row.try_get("phone_number").map_err(|e| e.to_string())?,
                party_type: row.try_get("party_type").map_err(|e| e.to_string())?,
                factory: row.try_get("factory").map_err(|e| e.to_string())?,
                party_name: row.try_get("party_name").map_err(|e| e.to_string())?,
                amount: row.try_get("amount").map_err(|e| e.to_string())?,
                payment_date: row.try_get("payment_date").map_err(|e| e.to_string())?,
                payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
                reference: row.try_get("reference").map_err(|e| e.to_string())?,
                notes: row.try_get("notes").map_err(|e| e.to_string())?,
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(payments)
}

#[tauri::command]
async fn update_payment(app: AppHandle, id: i64, payment: CreatePaymentInput) -> Result<(), String> {
    if payment.amount <= 0.0 { return Err("Amount 0 se zyada hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query(
        "UPDATE payments SET amount = ?1, payment_date = ?2, payment_method = ?3, reference = ?4, notes = ?5 WHERE id = ?6",
    )
    .bind(payment.amount)
    .bind(&payment.payment_date)
    .bind(&payment.payment_method)
    .bind(&payment.reference)
    .bind(&payment.notes)
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Payment update nahi ho saka: {}", error))?;

    if result.rows_affected() == 0 { return Err("Payment record nahi mila.".to_string()); }
    Ok(())
}

#[tauri::command]
async fn delete_payment(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("DELETE FROM payments WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Payment delete nahi ho saka: {}", error))?;

    if result.rows_affected() == 0 { return Err("Payment record nahi mila.".to_string()); }
    Ok(())
}

// =====================================================
// SAVE / EDIT PARTY (factory-scoped)
// =====================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UpsertPartyInput {
    name: String,
    phone_number: String,
    party_type: String,
    factory: String,
    address: Option<String>,
    opening_balance: f64,
}

#[tauri::command]
async fn save_party(app: AppHandle, party: UpsertPartyInput) -> Result<Party, String> {
    if party.name.trim().is_empty() { return Err("Party name required hai.".to_string()); }
    if party.phone_number.trim().is_empty() { return Err("Phone number required hai.".to_string()); }
    if party.factory.trim().is_empty() { return Err("Factory select karein.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    sqlx::query(
        r#"
        INSERT INTO parties (name, phone_number, party_type, factory, address, opening_balance)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(phone_number, party_type, factory) DO UPDATE SET
            name = excluded.name, address = excluded.address, opening_balance = excluded.opening_balance
        "#,
    )
    .bind(party.name.trim())
    .bind(party.phone_number.trim())
    .bind(&party.party_type)
    .bind(party.factory.trim())
    .bind(&party.address)
    .bind(party.opening_balance)
    .execute(&pool)
    .await
    .map_err(|error| format!("Party save nahi ho saki: {}", error))?;

    let row = sqlx::query("SELECT id, name, phone_number, party_type, factory, address, opening_balance, created_at FROM parties WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
        .bind(party.phone_number.trim())
        .bind(&party.party_type)
        .bind(party.factory.trim())
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Party {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        name: row.try_get("name").map_err(|e| e.to_string())?,
        phone_number: row.try_get("phone_number").map_err(|e| e.to_string())?,
        party_type: row.try_get("party_type").map_err(|e| e.to_string())?,
        factory: row.try_get("factory").map_err(|e| e.to_string())?,
        address: row.try_get("address").map_err(|e| e.to_string())?,
        opening_balance: row.try_get("opening_balance").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    })
}

async fn calculate_party_balance(pool: &SqlitePool, phone_number: &str, party_type: &str, factory: &str) -> Result<f64, String> {
    let party_row = sqlx::query("SELECT opening_balance FROM parties WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
        .bind(phone_number)
        .bind(party_type)
        .bind(factory)
        .fetch_optional(pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Party nahi mili.".to_string())?;

    let opening_balance: f64 = party_row.try_get("opening_balance").map_err(|e| e.to_string())?;
    let business_table = if party_type == "supplier" { "purchases" } else { "sales" };

    let business_query = format!("SELECT COALESCE(SUM(total_amount), 0.0) as total FROM {} WHERE phone_number = ?1 AND factory = ?2", business_table);
    let business_row = sqlx::query(&business_query).bind(phone_number).bind(factory).fetch_one(pool).await.map_err(|e| e.to_string())?;
    let total_business: f64 = business_row.try_get("total").map_err(|e| e.to_string())?;

    let paid_query = format!("SELECT COALESCE(SUM(paid_amount), 0.0) as total FROM {} WHERE phone_number = ?1 AND factory = ?2", business_table);
    let paid_row = sqlx::query(&paid_query).bind(phone_number).bind(factory).fetch_one(pool).await.map_err(|e| e.to_string())?;
    let total_paid_at_creation: f64 = paid_row.try_get("total").map_err(|e| e.to_string())?;

    let extra_payments_row = sqlx::query("SELECT COALESCE(SUM(amount), 0.0) as total FROM payments WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
        .bind(phone_number)
        .bind(party_type)
        .bind(factory)
        .fetch_one(pool)
        .await
        .map_err(|e| e.to_string())?;
    let extra_payments: f64 = extra_payments_row.try_get("total").map_err(|e| e.to_string())?;

    let total_payments = total_paid_at_creation + extra_payments;
    Ok(opening_balance + total_business - total_payments)
}

#[tauri::command]
async fn delete_party(app: AppHandle, phone_number: String, party_type: String, factory: String) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let balance = calculate_party_balance(&pool, &phone_number, &party_type, &factory).await?;

    if balance.abs() > 0.01 {
        let label = if party_type == "supplier" { "Hum inko dete hain" } else { "Ye humein dete hain" };
        return Err(format!("Khata clear nahi hai, isliye delete nahi ho sakta. {}: {}", label, balance.abs()));
    }

    let result = sqlx::query("DELETE FROM parties WHERE phone_number = ?1 AND party_type = ?2 AND factory = ?3")
        .bind(&phone_number)
        .bind(&party_type)
        .bind(&factory)
        .execute(&pool)
        .await
        .map_err(|error| format!("Party delete nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Party nahi mili.".to_string()); }
    Ok(())
}

// =====================================================
// EXPENSE CATEGORIES
// =====================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExpenseCategory {
    id: i64,
    name: String,
}

#[tauri::command]
async fn get_expense_categories(app: AppHandle) -> Result<Vec<ExpenseCategory>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query("SELECT id, name FROM expense_categories ORDER BY name ASC")
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Categories load nahi ho sakin: {}", error))?;

    let categories = rows
        .into_iter()
        .map(|row| Ok(ExpenseCategory {
            id: row.try_get("id").map_err(|e| e.to_string())?,
            name: row.try_get("name").map_err(|e| e.to_string())?,
        }))
        .collect::<Result<Vec<_>, String>>()?;

    Ok(categories)
}

#[tauri::command]
async fn add_expense_category(app: AppHandle, name: String) -> Result<ExpenseCategory, String> {
    if name.trim().is_empty() { return Err("Category name required hai.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let existing = sqlx::query("SELECT id FROM expense_categories WHERE name = ?1")
        .bind(name.trim())
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() { return Err("Ye category pehle se maujood hai.".to_string()); }

    let result = sqlx::query("INSERT INTO expense_categories (name) VALUES (?1)")
        .bind(name.trim())
        .execute(&pool)
        .await
        .map_err(|error| format!("Category add nahi ho saki: {}", error))?;

    Ok(ExpenseCategory { id: result.last_insert_rowid(), name: name.trim().to_string() })
}

#[tauri::command]
async fn delete_expense_category(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let category_row = sqlx::query("SELECT name FROM expense_categories WHERE id = ?1")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Category nahi mili.".to_string())?;

    let name: String = category_row.try_get("name").map_err(|e| e.to_string())?;

    let usage_row = sqlx::query("SELECT COUNT(*) as count FROM expenses WHERE category = ?1")
        .bind(&name)
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    let usage_count: i64 = usage_row.try_get("count").map_err(|e| e.to_string())?;

    if usage_count > 0 {
        return Err(format!("Ye category {} expense(s) mein istemal ho rahi hai, isliye delete nahi ho sakti.", usage_count));
    }

    let result = sqlx::query("DELETE FROM expense_categories WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Category delete nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Category nahi mili.".to_string()); }
    Ok(())
}

// =====================================================
// EXPENSES
// =====================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExpenseInput {
    pub expense_date: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub factory: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Expense {
    pub id: i64,
    pub expense_date: String,
    pub category: String,
    pub description: Option<String>,
    pub amount: f64,
    pub payment_method: String,
    pub notes: Option<String>,
    pub factory: String,
    pub created_at: String,
}

fn validate_expense_input(input: &CreateExpenseInput) -> Result<(), String> {
    if input.category.trim().is_empty() { return Err("Category select karein.".to_string()); }
    if input.amount <= 0.0 { return Err("Amount 0 se zyada hona chahiye.".to_string()); }
    match input.payment_method.as_str() {
        "Cash" | "Bank" | "Other" => Ok(()),
        _ => Err("Invalid payment method.".to_string()),
    }
}

#[tauri::command]
async fn create_expense(
    app: AppHandle,
    expense: CreateExpenseInput,
) -> Result<Expense, String> {
    validate_expense_input(&expense)?;

    if expense.factory.trim().is_empty() {
        return Err("Factory select karna zaroori hai.".to_string());
    }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query(
        "INSERT INTO expenses
        (expense_date, category, description, amount, payment_method, notes, factory)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(&expense.expense_date)
    .bind(expense.category.trim())
    .bind(&expense.description)
    .bind(expense.amount)
    .bind(&expense.payment_method)
    .bind(&expense.notes)
    .bind(expense.factory.trim())
    .execute(&pool)
    .await
    .map_err(|error| format!("Expense save nahi ho saka: {}", error))?;

    let expense_id = result.last_insert_rowid();

    let row = sqlx::query(
        "SELECT
            id,
            expense_date,
            category,
            description,
            amount,
            payment_method,
            notes,
            factory,
            created_at
         FROM expenses
         WHERE id = ?1",
    )
    .bind(expense_id)
    .fetch_one(&pool)
    .await
    .map_err(|error| error.to_string())?;

    Ok(Expense {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        expense_date: row.try_get("expense_date").map_err(|e| e.to_string())?,
        category: row.try_get("category").map_err(|e| e.to_string())?,
        description: row.try_get("description").map_err(|e| e.to_string())?,
        amount: row.try_get("amount").map_err(|e| e.to_string())?,
        payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
        notes: row.try_get("notes").map_err(|e| e.to_string())?,
        factory: row.try_get("factory").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
async fn get_expenses(app: AppHandle) -> Result<Vec<Expense>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query(
        "SELECT
            id,
            expense_date,
            category,
            description,
            amount,
            payment_method,
            notes,
            factory,
            created_at
         FROM expenses
         ORDER BY expense_date DESC, id DESC",
    )
    .fetch_all(&pool)
    .await
    .map_err(|error| format!("Expenses load nahi ho sakin: {}", error))?;

    let expenses = rows
        .into_iter()
        .map(|row| {
            Ok(Expense {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                expense_date: row.try_get("expense_date").map_err(|e| e.to_string())?,
                category: row.try_get("category").map_err(|e| e.to_string())?,
                description: row.try_get("description").map_err(|e| e.to_string())?,
                amount: row.try_get("amount").map_err(|e| e.to_string())?,
                payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
                notes: row.try_get("notes").map_err(|e| e.to_string())?,
                factory: row.try_get("factory").map_err(|e| e.to_string())?,
                created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(expenses)
}

#[tauri::command]
async fn update_expense(
    app: AppHandle,
    id: i64,
    expense: CreateExpenseInput,
) -> Result<Expense, String> {
    validate_expense_input(&expense)?;

    if expense.factory.trim().is_empty() {
        return Err("Factory select karna zaroori hai.".to_string());
    }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query(
        "UPDATE expenses
         SET
            expense_date = ?1,
            category = ?2,
            description = ?3,
            amount = ?4,
            payment_method = ?5,
            notes = ?6,
            factory = ?7
         WHERE id = ?8",
    )
    .bind(&expense.expense_date)
    .bind(expense.category.trim())
    .bind(&expense.description)
    .bind(expense.amount)
    .bind(&expense.payment_method)
    .bind(&expense.notes)
    .bind(expense.factory.trim())
    .bind(id)
    .execute(&pool)
    .await
    .map_err(|error| format!("Expense update nahi ho saka: {}", error))?;

    if result.rows_affected() == 0 {
        return Err("Expense record nahi mila.".to_string());
    }

    let row = sqlx::query(
        "SELECT
            id,
            expense_date,
            category,
            description,
            amount,
            payment_method,
            notes,
            factory,
            created_at
         FROM expenses
         WHERE id = ?1",
    )
    .bind(id)
    .fetch_one(&pool)
    .await
    .map_err(|error| error.to_string())?;

    Ok(Expense {
        id: row.try_get("id").map_err(|e| e.to_string())?,
        expense_date: row.try_get("expense_date").map_err(|e| e.to_string())?,
        category: row.try_get("category").map_err(|e| e.to_string())?,
        description: row.try_get("description").map_err(|e| e.to_string())?,
        amount: row.try_get("amount").map_err(|e| e.to_string())?,
        payment_method: row.try_get("payment_method").map_err(|e| e.to_string())?,
        notes: row.try_get("notes").map_err(|e| e.to_string())?,
        factory: row.try_get("factory").map_err(|e| e.to_string())?,
        created_at: row.try_get("created_at").map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
async fn delete_expense(app: AppHandle, id: i64) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("DELETE FROM expenses WHERE id = ?1")
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Expense delete nahi ho saka: {}", error))?;

    if result.rows_affected() == 0 { return Err("Expense record nahi mila.".to_string()); }
    Ok(())
}

// =====================================================
// APP SETTINGS
// =====================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    factory_name: String,
    factory_phone: String,
    factory_address: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveAppSettingsInput {
    factory_name: String,
    factory_phone: String,
    factory_address: String,
}

#[tauri::command]
async fn get_app_settings(app: AppHandle) -> Result<AppSettings, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let row = sqlx::query("SELECT factory_name, factory_phone, factory_address FROM app_settings WHERE id = 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| e.to_string())?;

    Ok(AppSettings {
        factory_name: row.try_get("factory_name").map_err(|e| e.to_string())?,
        factory_phone: row.try_get("factory_phone").map_err(|e| e.to_string())?,
        factory_address: row.try_get("factory_address").map_err(|e| e.to_string())?,
    })
}

#[tauri::command]
async fn save_app_settings(app: AppHandle, settings: SaveAppSettingsInput) -> Result<AppSettings, String> {
    if settings.factory_name.trim().is_empty() { return Err("Factory name required hai.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    sqlx::query("UPDATE app_settings SET factory_name = ?1, factory_phone = ?2, factory_address = ?3 WHERE id = 1")
        .bind(settings.factory_name.trim())
        .bind(settings.factory_phone.trim())
        .bind(settings.factory_address.trim())
        .execute(&pool)
        .await
        .map_err(|error| format!("Settings save nahi ho sakin: {}", error))?;

    get_app_settings(app).await
}

// =====================================================
// MAAL CATEGORIES
// =====================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct MaalCategory {
    id: i64,
    name: String,
    is_active: bool,
}

#[tauri::command]
async fn get_maal_categories(app: AppHandle) -> Result<Vec<MaalCategory>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query("SELECT id, name, is_active FROM maal_categories ORDER BY name ASC")
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Categories load nahi ho sakin: {}", error))?;

    let categories = rows
        .into_iter()
        .map(|row| {
            let is_active_int: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
            Ok(MaalCategory {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                name: row.try_get("name").map_err(|e| e.to_string())?,
                is_active: is_active_int != 0,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(categories)
}

#[tauri::command]
async fn add_maal_category(app: AppHandle, name: String) -> Result<MaalCategory, String> {
    if name.trim().is_empty() { return Err("Category name required hai.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let existing = sqlx::query("SELECT id FROM maal_categories WHERE name = ?1")
        .bind(name.trim())
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() { return Err("Ye category pehle se maujood hai.".to_string()); }

    let result = sqlx::query("INSERT INTO maal_categories (name) VALUES (?1)")
        .bind(name.trim())
        .execute(&pool)
        .await
        .map_err(|error| format!("Category add nahi ho saki: {}", error))?;

    Ok(MaalCategory { id: result.last_insert_rowid(), name: name.trim().to_string(), is_active: true })
}

#[tauri::command]
async fn toggle_maal_category(app: AppHandle, id: i64, is_active: bool) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("UPDATE maal_categories SET is_active = ?1 WHERE id = ?2")
        .bind(if is_active { 1 } else { 0 })
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Category update nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Category nahi mili.".to_string()); }
    Ok(())
}

// =====================================================
// PAYMENT METHODS
// =====================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct PaymentMethodRecord {
    id: i64,
    name: String,
    is_active: bool,
}

#[tauri::command]
async fn get_payment_methods(app: AppHandle) -> Result<Vec<PaymentMethodRecord>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query("SELECT id, name, is_active FROM payment_methods ORDER BY name ASC")
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Payment methods load nahi ho sakin: {}", error))?;

    let methods = rows
        .into_iter()
        .map(|row| {
            let is_active_int: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
            Ok(PaymentMethodRecord {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                name: row.try_get("name").map_err(|e| e.to_string())?,
                is_active: is_active_int != 0,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(methods)
}

#[tauri::command]
async fn add_payment_method(app: AppHandle, name: String) -> Result<PaymentMethodRecord, String> {
    if name.trim().is_empty() { return Err("Payment method name required hai.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let existing = sqlx::query("SELECT id FROM payment_methods WHERE name = ?1")
        .bind(name.trim())
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() { return Err("Ye payment method pehle se maujood hai.".to_string()); }

    let result = sqlx::query("INSERT INTO payment_methods (name) VALUES (?1)")
        .bind(name.trim())
        .execute(&pool)
        .await
        .map_err(|error| format!("Payment method add nahi ho saka: {}", error))?;

    Ok(PaymentMethodRecord { id: result.last_insert_rowid(), name: name.trim().to_string(), is_active: true })
}

#[tauri::command]
async fn toggle_payment_method(app: AppHandle, id: i64, is_active: bool) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("UPDATE payment_methods SET is_active = ?1 WHERE id = ?2")
        .bind(if is_active { 1 } else { 0 })
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Payment method update nahi ho saka: {}", error))?;

    if result.rows_affected() == 0 { return Err("Payment method nahi mila.".to_string()); }
    Ok(())
}

// =====================================================
// FACTORIES
// =====================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Factory {
    id: i64,
    name: String,
    is_active: bool,
}

#[tauri::command]
async fn get_factories(app: AppHandle) -> Result<Vec<Factory>, String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let rows = sqlx::query("SELECT id, name, is_active FROM factories ORDER BY name ASC")
        .fetch_all(&pool)
        .await
        .map_err(|error| format!("Factories load nahi ho sakin: {}", error))?;

    let factories = rows
        .into_iter()
        .map(|row| {
            let is_active_int: i64 = row.try_get("is_active").map_err(|e| e.to_string())?;
            Ok(Factory {
                id: row.try_get("id").map_err(|e| e.to_string())?,
                name: row.try_get("name").map_err(|e| e.to_string())?,
                is_active: is_active_int != 0,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;

    Ok(factories)
}

#[tauri::command]
async fn add_factory(app: AppHandle, name: String) -> Result<Factory, String> {
    if name.trim().is_empty() { return Err("Factory name required hai.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let existing = sqlx::query("SELECT id FROM factories WHERE name = ?1")
        .bind(name.trim())
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() { return Err("Ye factory pehle se maujood hai.".to_string()); }

    let result = sqlx::query("INSERT INTO factories (name) VALUES (?1)")
        .bind(name.trim())
        .execute(&pool)
        .await
        .map_err(|error| format!("Factory add nahi ho saki: {}", error))?;

    Ok(Factory { id: result.last_insert_rowid(), name: name.trim().to_string(), is_active: true })
}

#[tauri::command]
async fn toggle_factory(app: AppHandle, id: i64, is_active: bool) -> Result<(), String> {
    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let result = sqlx::query("UPDATE factories SET is_active = ?1 WHERE id = ?2")
        .bind(if is_active { 1 } else { 0 })
        .bind(id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Factory update nahi ho saki: {}", error))?;

    if result.rows_affected() == 0 { return Err("Factory nahi mili.".to_string()); }
    Ok(())
}

// =====================================================
// CHANGE USERNAME / PASSWORD
// =====================================================

#[tauri::command]
async fn change_username(app: AppHandle, user_id: i64, new_username: String) -> Result<(), String> {
    if new_username.trim().is_empty() { return Err("Username khaali nahi ho sakta.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let existing = sqlx::query("SELECT id FROM users WHERE username = ?1 AND id != ?2")
        .bind(new_username.trim())
        .bind(user_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?;

    if existing.is_some() { return Err("Ye username pehle se istemal ho raha hai.".to_string()); }

    sqlx::query("UPDATE users SET username = ?1 WHERE id = ?2")
        .bind(new_username.trim())
        .bind(user_id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Username update nahi ho saka: {}", error))?;

    Ok(())
}

#[tauri::command]
async fn change_password(app: AppHandle, user_id: i64, current_password: String, new_password: String) -> Result<(), String> {
    use argon2::{
        password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
        Argon2,
    };
    use rand_core::OsRng;

    if new_password.trim().len() < 4 { return Err("Naya password kam se kam 4 characters ka hona chahiye.".to_string()); }

    let pool = get_database(&app).await?;
    initialize_database(&pool).await?;

    let row = sqlx::query("SELECT password_hash FROM users WHERE id = ?1")
        .bind(user_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "User nahi mila.".to_string())?;

    let current_hash: String = row.try_get("password_hash").map_err(|e| e.to_string())?;
    let parsed_hash = PasswordHash::new(&current_hash).map_err(|e| e.to_string())?;

    Argon2::default()
        .verify_password(current_password.as_bytes(), &parsed_hash)
        .map_err(|_| "Current password ghalat hai.".to_string())?;

    let salt = SaltString::generate(&mut OsRng);
    let new_hash = Argon2::default()
        .hash_password(new_password.as_bytes(), &salt)
        .map_err(|e| e.to_string())?
        .to_string();

    sqlx::query("UPDATE users SET password_hash = ?1 WHERE id = ?2")
        .bind(&new_hash)
        .bind(user_id)
        .execute(&pool)
        .await
        .map_err(|error| format!("Password update nahi ho saka: {}", error))?;

    Ok(())
}

// =====================================================
// BACKUP / RESTORE
// =====================================================

#[tauri::command]
async fn backup_database(app: AppHandle, destination_path: String) -> Result<(), String> {
    let app_config_dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    let db_path = app_config_dir.join("app.db");

    std::fs::copy(&db_path, &destination_path).map_err(|error| format!("Backup fail ho gaya: {}", error))?;
    Ok(())
}

#[tauri::command]
async fn restore_database(app: AppHandle, source_path: String) -> Result<(), String> {
    let header = std::fs::read(&source_path).map_err(|error| error.to_string())?;

    if header.len() < 16 || &header[0..16] != b"SQLite format 3\0" {
        return Err("Ye file valid backup nahi hai (SQLite database nahi hai).".to_string());
    }

    let app_config_dir = app.path().app_config_dir().map_err(|error| error.to_string())?;
    let db_path = app_config_dir.join("app.db");

    std::fs::copy(&source_path, &db_path).map_err(|error| format!("Restore fail ho gaya: {}", error))?;
    Ok(())
}

// =====================================================
// GENERIC BINARY FILE SAVE
// =====================================================

#[tauri::command]
async fn save_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    std::fs::write(&path, data).map_err(|error| format!("File save nahi ho saka: {}", error))
}

// =====================================================
// TAURI RUN
// =====================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            hash_password,
            login,
            create_purchase,
            get_purchases,
            update_purchase,
            delete_purchase,
            create_sale,
            get_sales,
            update_sale,
            delete_sale,
            get_parties,
            get_party_ledger,
            create_payment,
            get_payments,
            update_payment,
            delete_payment,
            save_party,
            delete_party,
            get_expense_categories,
            add_expense_category,
            delete_expense_category,
            create_expense,
            get_expenses,
            update_expense,
            delete_expense,
            get_app_settings,
            save_app_settings,
            get_maal_categories,
            add_maal_category,
            toggle_maal_category,
            get_payment_methods,
            add_payment_method,
            toggle_payment_method,
            get_factories,
            add_factory,
            toggle_factory,
            change_username,
            change_password,
            backup_database,
            restore_database,
            save_binary_file
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();

            tauri::async_runtime::block_on(async move {
                let pool = get_database(&app_handle).await?;
                initialize_database(&pool).await
            })
            .map_err(|error: String| Box::<dyn std::error::Error>::from(error))?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}