# Kamran Gujjer Enterprise

A modern Windows desktop **Factory Management System** designed to simplify day-to-day inventory, sales, billing, expenses, and stock management operations.

Built with **React, TypeScript, Tauri, SQLite, and Tailwind CSS**, the application provides a fast, lightweight, and reliable desktop experience for managing factory operations.

---

## 📌 Overview

**Kamran Gujjer Enterprise** is a desktop-based factory management application developed for managing scrap and related factory operations.

The system provides a centralized interface for:

* Managing factory stock
* Recording stock adjustments
* Creating sales and bills
* Generating PDF invoices
* Managing product categories
* Tracking expenses and ledger records
* Monitoring low-stock conditions
* Managing user authentication

The application is designed to be simple enough for daily use while maintaining a professional and scalable software architecture.

---

## ✨ Key Features

### 🔐 Authentication

* Secure login interface
* Username and password authentication
* Password visibility toggle
* User role support
* Authentication validation and error handling

### 📊 Dashboard

* Overview of available stock
* Important factory statistics
* Quick access to major modules
* Low-stock awareness

### 📦 Stock Management

* Track available inventory
* Add and remove stock
* Record stock adjustments
* Maintain adjustment history
* Automatically update stock quantities

### 🔄 Stock Adjustments

* Add stock adjustments
* Remove stock adjustments
* Record adjustment reasons
* Track adjustment history
* Keep inventory quantities synchronized

### 💰 Sales & Billing

* Create new sales bills
* Automatic bill numbering
* Customer/supplier information
* Product category selection
* Quantity and rate per kilogram
* Automatic total calculation
* Customer phone number support

### 🧾 PDF Invoice Generation

* Generate professional PDF bills
* A5 invoice format
* Structured invoice information
* Printable sales documents

### 📒 Ledger & Expenses

* Record factory expenses
* Maintain expense records
* Track financial activity
* Organized ledger management

### ⚠️ Low Stock Alerts

* Monitor inventory levels
* Identify products with low stock
* Improve inventory management

### ⚙️ Settings

* Manage product categories
* Add categories
* Edit existing categories
* Configure application-related settings

---

## 🖥️ Screenshots

> Screenshots will be added here.

### Login

![Login Screen](./screenShots/login.png)

### Dashboard

![Dashboard](./screenShots/dashboard.png)

### Stock Adjustments

![Stock Adjustments](./screenShots/stock-adjustments.png)

### Sales & Billing

![Sales and Billing](./screenShots/purchase.png)

### Settings

![Settings](./screenShots/settings.png)

### Ledger

![Ledger](./screenShots/Khata.png)

---

## 🛠️ Tech Stack

| Technology   | Purpose                           |
| ------------ | --------------------------------- |
| React        | Frontend UI                       |
| TypeScript   | Type-safe application development |
| Tailwind CSS | UI styling                        |
| Tauri        | Desktop application framework     |
| Rust         | Native/backend layer              |
| SQLite       | Local database                    |
| jsPDF        | PDF invoice generation            |
| Lucide React | UI icons                          |
| Vite         | Frontend build tooling            |
| NPM          | Package management                |

---

## 🏗️ Application Architecture

The application follows a desktop-oriented architecture where the React frontend communicates with the native Tauri/Rust layer and local SQLite database.

```text
┌─────────────────────────────┐
│        React Frontend       │
│     TypeScript + Tailwind   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│        Tauri / Rust         │
│     Native Application      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│          SQLite             │
│       Local Database        │
└─────────────────────────────┘
```

This architecture allows the application to run as a lightweight native Windows desktop application without requiring a traditional web server for local factory operations.

---

## 📁 Project Structure

```text
kamran-gujjer-enterprise/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── assets/
│   ├── hooks/
│   ├── types/
│   └── ...
│
├── src-tauri/
│   ├── src/
│   ├── migrations/
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── screenshots/
│   ├── login.png
│   ├── dashboard.png
│   ├── stock-adjustments.png
│   ├── billing.png
│   ├── settings.png
│   └── ledger.png
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Before running the project locally, make sure you have the required development tools installed:

* Node.js
* NPM
* Rust
* Cargo
* Tauri CLI
* Windows development environment

### Clone the Repository

```bash
git clone https://github.com/Anas-Shakeel199/kamran-gujjer-enterprise.git
```

```bash
cd kamran-gujjer-enterprise
```

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run tauri dev
```

The application will launch in Tauri development mode.

---

## 🏭 Production Build

To create a production build:

```bash
npm run build
```

Then create the Windows desktop production build:

```bash
npm run tauri build
```

The generated production bundles are placed inside:

```text
src-tauri/target/release/bundle/
```

---

## 📦 Windows Installation

The production build provides Windows installers in two formats.

### NSIS Installer

```text
kamran-gujjer-enterprise_0.1.0_x64-setup.exe
```

### MSI Installer

```text
kamran-gujjer-enterprise_0.1.0_x64_en-US.msi
```

The recommended option for most Windows users is the **NSIS `.exe` installer**.

---

## 🔖 Current Release

### v0.1.0 — Initial Production Release

The `v0.1.0` release represents the first stable production version of the application.

Included:

* Windows x64 desktop application
* Authentication
* Dashboard
* Stock management
* Stock adjustments
* Sales and billing
* PDF invoice generation
* Ledger/expense management
* Low-stock alerts
* Category management
* Local SQLite database
* Windows MSI installer
* Windows NSIS installer

---

## 🧪 Testing

The production desktop application has been tested after installation on Windows.

Testing includes:

* Authentication flow
* Dashboard functionality
* Stock management
* Stock adjustments
* Sales and billing
* Bill numbering
* PDF generation
* Settings and category management
* Data persistence after application restart
* Production installer
* Windows desktop application launch

---

## 🔒 Data & Security

The application is designed for local factory operations and uses a local SQLite database for persistent application data.

Sensitive configuration values and credentials should not be committed to the repository.

Before making the repository public, ensure that:

```text
.env
.env.*
node_modules/
src-tauri/target/
```

and other generated or sensitive files are excluded through `.gitignore`.

---

## 🗺️ Future Improvements

Potential future improvements include:

* Advanced reporting and analytics
* Monthly and yearly sales reports
* Export reports to Excel/PDF
* Backup and restore functionality
* User and role management
* Advanced financial reporting
* Inventory history and analytics
* Automated database backup
* Improved search and filtering
* Multi-language support
* Application update mechanism

---

## 👨‍💻 Author

**Anas Shakeel**

BS Computer Science | Full-Stack / MERN Developer

Focused on building modern web and desktop applications using JavaScript/TypeScript ecosystems.

### Technologies

```text
React
TypeScript
Node.js
Express.js
MongoDB
Tauri
Rust
SQLite
Tailwind CSS
```

---

## 📄 License

This project is currently maintained as a private/client-oriented software project.

---

## ⭐ Project Status

**Version:** `v0.1.0`
**Status:** Stable Production Release
**Platform:** Windows x64
**Application Type:** Desktop Factory Management System
