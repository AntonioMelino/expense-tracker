# Expense Tracker — Project Context for Claude

## What This Project Is

A fullstack personal expense tracker web application. Users can register, log in, manage income/expense transactions grouped by categories, and view a monthly dashboard with balance summary.

## Stack

| Layer         | Technology                          |
| ------------- | ----------------------------------- |
| Backend       | ASP.NET Core 10 Minimal API         |
| ORM           | Entity Framework Core 10            |
| Database      | PostgreSQL 17 (Docker)              |
| Auth          | ASP.NET Identity + JWT              |
| Frontend      | React 19 + TypeScript + Vite        |
| UI Components | shadcn/ui (Radix + Tailwind CSS v4) |
| Server State  | TanStack Query v5                   |
| Client State  | Zustand                             |
| HTTP Client   | Axios                               |
| Router        | React Router v7                     |
| Charts        | Recharts                            |

## Project Structure

```
expense-tracker/
├── backend/
│   ├── ExpenseTracker.sln
│   └── src/
│       ├── ExpenseTracker.Api/          # Minimal API host, endpoints, DTOs
│       ├── ExpenseTracker.Domain/       # Entities, enums, repository interfaces
│       └── ExpenseTracker.Infrastructure/  # EF Core, repositories, JWT service
├── frontend/                            # React + Vite SPA
├── docker-compose.yml                   # PostgreSQL dev database
├── CLAUDE.md                            # This file
└── README.md
```

## Database (Docker)

```
Host:     localhost:5432
Database: expensetracker
User:     dev
Password: dev123
```

Start with: `docker compose up -d`

## Backend Connection String

Development (`appsettings.Development.json`):

```
Host=localhost;Port=5432;Database=expensetracker;Username=dev;Password=dev123
```

## Auth Strategy

- **Access token**: JWT, 15 minutes TTL, signed with HS256
- **Refresh token**: opaque string, 7 days TTL, stored hashed in `ApplicationUser.RefreshTokenHash`
- Flow: Login → returns `{ accessToken, refreshToken }` → client stores in memory/localStorage → on 401, call `POST /api/auth/refresh` → rotate tokens

## Domain Entities

### ApplicationUser (extends IdentityUser)

- `FullName: string`
- `RefreshTokenHash: string?`
- `RefreshTokenExpiry: DateTime?`

### Category

- `Id: Guid`
- `Name: string`
- `Color: string` (hex, e.g. `#FF5733`)
- `Icon: string` (emoji or icon name)
- `UserId: string` (FK → ApplicationUser)

### Transaction

- `Id: Guid`
- `Amount: decimal` (always positive)
- `Description: string`
- `Date: DateOnly`
- `Type: TransactionType` (Income = 0, Expense = 1)
- `CategoryId: Guid` (FK → Category)
- `UserId: string` (FK → ApplicationUser)
- `CreatedAt: DateTime`

### TransactionType (enum)

```csharp
public enum TransactionType { Income = 0, Expense = 1 }
```

## API Endpoints

### Auth

| Method | Path               | Description           |
| ------ | ------------------ | --------------------- |
| POST   | /api/auth/register | Register new user     |
| POST   | /api/auth/login    | Login, returns tokens |
| POST   | /api/auth/refresh  | Rotate refresh token  |
| POST   | /api/auth/logout   | Revoke refresh token  |

### Categories (all require auth)

| Method | Path                 | Description               |
| ------ | -------------------- | ------------------------- |
| GET    | /api/categories      | List all for current user |
| POST   | /api/categories      | Create category           |
| PUT    | /api/categories/{id} | Update category           |
| DELETE | /api/categories/{id} | Delete category           |

### Transactions (all require auth)

| Method | Path                      | Description                                             |
| ------ | ------------------------- | ------------------------------------------------------- |
| GET    | /api/transactions         | Paginated list (filters: month, year, categoryId, type) |
| POST   | /api/transactions         | Create transaction                                      |
| PUT    | /api/transactions/{id}    | Update transaction                                      |
| DELETE | /api/transactions/{id}    | Delete transaction                                      |
| GET    | /api/transactions/summary | Monthly balance (income, expense, net)                  |

## Frontend Pages & Routes

| Route         | Page             | Description                           |
| ------------- | ---------------- | ------------------------------------- |
| /login        | LoginPage        | Login form                            |
| /register     | RegisterPage     | Register form                         |
| /             | DashboardPage    | Balance summary + recent transactions |
| /transactions | TransactionsPage | Paginated list with filters           |
| /categories   | CategoriesPage   | Category CRUD                         |

## Frontend Key Patterns

- `src/api/client.ts` — Axios instance with base URL + JWT interceptors
- `src/store/authStore.ts` — Zustand store: `{ user, accessToken, setAuth, logout }`
- TanStack Query: `queryKey` arrays use `['transactions', filters]` and `['categories']`
- All forms use React Hook Form + Zod for validation

## Development Commands

### Backend

```bash
# Start PostgreSQL
docker compose up -d

# Run migrations
cd backend
dotnet ef database update --project src/ExpenseTracker.Infrastructure --startup-project src/ExpenseTracker.Api

# Run API (port 5000 HTTP / 5001 HTTPS)
cd backend/src/ExpenseTracker.Api
dotnet run
```

### Frontend

```bash
cd frontend
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # Production build
npm run test       # Vitest
```

## Commit Rules

After completing each task or feature, always suggest the commit
using this format with a title and detailed description:

git commit -m "type: short descriptive title" -m "- concrete detail 1

- concrete detail 2
- concrete detail 3"

The second -m is the commit body. Each point must explain
concretely which files or functionalities were created or modified.

Prefixes to use:

- feat: new functionality
- fix: bug fix
- chore: configuration or setup
- refactor: code reorganization without changing functionality
- test: adding or modifying tests

After each suggested commit, remind me to run git push
to keep GitHub up to date.

## Code Style Rules

- **Immutability**: never mutate objects; always return new instances
- **No magic numbers**: use named constants
- **Small functions**: <50 lines
- **Small files**: <800 lines
- **No silent error swallowing**: handle every exception explicitly
- **Validation at boundaries**: validate all DTOs before processing
