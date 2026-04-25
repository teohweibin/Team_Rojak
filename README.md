# StockWise — AI Inventory Optimizer

An intelligent inventory management system powered by **Z AI GLM**, designed to empower Malaysian SMEs with AI-driven stock optimization, strategy simulation, and real-time market insights.

Built for **UMHackathon 2026** | Category: AI-Powered Business Intelligence

**Live Demo**: [https://c1ye938tnkg0-deploy.space.z.ai/](https://c1ye938tnkg0-deploy.space.z.ai/)

**Demo Video**: [https://drive.google.com/file/d/1aKh1kCwmHk1g47e16dBXVQ7pNNWQsBBk/view?usp=sharing](https://drive.google.com/file/d/1aKh1kCwmHk1g47e16dBXVQ7pNNWQsBBk/view?usp=sharing)

---

## Problem Statement

Malaysian SME traders operating in the import and distribution sector face increasingly complex inventory decisions that span multiple foreign suppliers, fluctuating exchange rates, and unpredictable demand cycles. Traditional inventory management tools rely on rule-based threshold alerts, failing to account for unstructured market intelligence such as supply chain disruptions, geopolitical shifts, and currency devaluations.

**StockWise bridges this gap** by combining structured operational data with unstructured market signals through AI-powered reasoning.

---

## Key Features

### AI-Powered Recommendations
- Analyzes inventory levels, sales velocity, exchange rates, and market news simultaneously
- Generates prioritized recommendations with **transparent reasoning chains**
- Cross-references market news articles to provide news-informed insights
- Estimates financial impact (MYR) for each recommendation

### Strategy Validation & Simulation
- Mathematical simulation of inventory strategies (conservative, balanced, aggressive)
- AI-powered multi-factor trade-off analysis (cash flow, exchange rate risk, supply chain risk)
- Side-by-side scenario comparison for informed decision-making

### Dashboard & Analytics
- Real-time KPI cards (Total Inventory Value, At-Risk Stock, AI Suggestions, Estimated Savings)
- Interactive charts for sales trends, stock distribution, and revenue visualization
- Clickable KPIs with quick navigation to relevant modules

### Comprehensive Inventory Management
- Full CRUD for products, suppliers, and inventory
- Automatic stock status classification (Critical / Low / Healthy / Out of Stock)
- Sales velocity tracking with revenue charts and daily averages
- Multi-currency exchange rate tracking (USD, EUR, CNY to MYR)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| **State Management** | TanStack Query |
| **Charts** | Recharts |
| **Backend** | Next.js API Routes (RESTful) |
| **Database** | SQLite via Prisma ORM |
| **AI** | Z AI GLM via z-ai-web-dev-sdk |
| **Runtime** | Bun |
| **Language** | TypeScript |

---

## Getting Started

### Prerequisites
- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/StockWise.git
cd StockWise

# Install dependencies
bun install

# Set up database
bunx prisma migrate dev
bunx prisma db seed

# Start development server
bun dev
```

The application will be available at `http://localhost:3000`.

### Production Build

```bash
bun run build
bun start
```

---

## Database Schema

The system uses **7 interconnected models** managed by Prisma ORM:

| Model | Description |
|-------|-------------|
| `Supplier` | Supplier profiles (name, country, currency) |
| `Product` | Product catalog (SKU, price, reorder point, lead time) |
| `Inventory` | Current stock levels per product |
| `Sale` | Individual sales transactions with revenue tracking |
| `Recommendation` | AI-generated recommendations with reasoning chains |
| `InventoryMovement` | Audit log for inventory adjustments |
| `ExchangeRate` | Currency exchange rates (USD/EUR/CNY to MYR) |

---

## AI Integration Architecture

```
User clicks "Generate" button
        |
        v
API Route collects data from SQLite
(Products + Inventory + Sales + Exchange Rates + Market News)
        |
        v
Structured prompt (~2000 tokens) constructed
        |
        v
Sent to Z AI GLM (via z-ai-web-dev-sdk)
        |
        v
GLM returns JSON recommendations
(with reasoning chains + news references)
        |
        v
Parsed, validated (SKU matching), saved to database
        |
        v
Displayed to user with expandable reasoning details
```

Two AI-powered endpoints:
- `POST /api/recommendations/generate` — Inventory recommendations with news-informed reasoning
- `POST /api/simulate` — Strategy simulation with multi-factor trade-off analysis

---

## Project Structure

```
src/
  app/
    page.tsx                    # Main entry point
    layout.tsx                  # Root layout
    globals.css                 # Global styles (dark theme)
    api/
      dashboard/route.ts        # Dashboard KPIs
      inventory/route.ts        # Inventory management
      inventory/adjust/route.ts # Stock adjustments
      products/route.ts         # Product CRUD
      products/[id]/route.ts    # Single product operations
      suppliers/route.ts        # Supplier CRUD
      suppliers/[id]/route.ts   # Single supplier operations
      sales/route.ts            # Sales transactions
      sales-velocity/route.ts   # Sales analytics
      exchange-rates/route.ts   # Exchange rate management
      recommendations/route.ts # AI recommendations list
      recommendations/generate/route.ts  # AI recommendation generation
      recommendations/[id]/route.ts      # Update recommendation status
      simulate/route.ts         # Strategy simulation
  components/
    layout/Sidebar.tsx          # Navigation sidebar
    pages/
      DashboardPage.tsx         # Dashboard module
      InventoryPage.tsx         # Inventory management module
      ProductsPage.tsx          # Product & supplier management
      SalesVelocityPage.tsx     # Sales tracking & charts
      ExchangeRatesPage.tsx     # Exchange rate management
      MarketNewsPage.tsx        # Market news feed
      AIRecommendationsPage.tsx # AI recommendations display
      StrategyValidationPage.tsx # Strategy simulation
    ui/                         # shadcn/ui components
  hooks/                        # TanStack Query data hooks
  lib/
    db.ts                       # Prisma database client
    utils.ts                    # Utility functions
    validations.ts              # Input validation
    rate-limit.ts               # API rate limiting
prisma/
  schema.prisma                 # Database schema
  seed.ts                       # Demo data seed script
public/
  logo.svg                      # Application logo
```


---

## Team

UMHackathon 2026 Participants - Team 109

---

## License

This project was developed for UMHackathon 2026. All rights concerning the code submission and working prototype shall belong to the domain collaborators as per the UMHackathon 2026 Terms and Conditions.
