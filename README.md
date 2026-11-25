# Forno Vivo — Pizza Shop Microservices Platform

A full-stack microservices pizza ordering platform built with **TypeScript**, **Express**, **Prisma**, **PostgreSQL (Database per Service)**, **RabbitMQ**, **Nodemailer (Mailtrap)**, **Express API Gateway**, **React + Vite**, and **Docker Compose**.

## Architecture

| Component | Port | Database | Responsibilities |
| :--- | :--- | :--- | :--- |
| **API Gateway** | `8000` | — | Unified entry point, JWT verification, RBAC (`CUSTOMER` / `ADMIN`), reverse proxy routing |
| **Auth Service** | `4001` | `auth_db` | Customer & admin registration/login, bcrypt hashing, JWT issuance |
| **Product Service** | `4002` | `product_db` | Pizza menu, size variants (`MEDIUM`, `LARGE`, `XL`), pricing, atomic stock deduction |
| **Order Service** | `4003` | `order_db` | Order placement (Approach A synchronous stock check & deduction), order lifecycle, publishes `order.created` & `order.status.updated` |
| **Notification Service** | `4004` | `notification_db` | RabbitMQ consumer, sends confirmation & status emails via Mailtrap/Nodemailer, stores notification audit logs |
| **React Frontend** | `3000` / `5173` | — | Customer menu, cart/checkout, order tracking stepper, and Shop Owner console |
| **PostgreSQL 16** | `5432` | 4 isolated DBs | Initialized via `db/init/01-create-databases.sql` |
| **RabbitMQ 3.13** | `5672` / `15672` | — | Topic exchange `pizza.events` (`order.created`, `order.status.updated`) |

## Quick Start with Docker Compose

1. Copy `.env.example` to `.env` (optional: add Mailtrap SMTP credentials; without them, Notification Service uses Nodemailer's local JSON mock transport and logs notifications):

```bash
cp .env.example .env
```

2. Start all infrastructure, microservices, and the React frontend:

```bash
docker compose up --build
```

3. Open the app:
   - **Frontend UI**: http://localhost:3000
   - **API Gateway**: http://localhost:8000 (Swagger docs at `/docs`)
   - **RabbitMQ Management**: http://localhost:15672 (`pizza` / `pizza123`)

## Seeded Demo Accounts

- **Shop Owner (`ADMIN`)**: `owner@pizzashop.local` / `Owner123!`
- **Customer (`CUSTOMER`)**: `customer@pizzashop.local` / `Customer123!`

## Local Development (Without Running Services in Docker)

Start just PostgreSQL and RabbitMQ:

```bash
docker compose up -d postgres rabbitmq
```

Then in each service (`auth-service`, `product-service`, `order-service`, `notification-service`, `api-gateway`) and `frontend`:

```bash
cp .env.example .env
npm install
npm run build      # runs prisma generate + tsc where applicable
npm test
npm run dev
```

For services with Prisma seeds (`auth-service` and `product-service`):

```bash
npx prisma db push
npm run seed
```
