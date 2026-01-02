# GymPass Project - Complete File Tree

## Project Overview
Complete MVP for a gym membership/pass system with mobile app, staff web app, and backend API.

## File Tree

```
gympass/
├── README.md                                    # Main documentation
├── .gitignore                                   # Root gitignore
│
├── backend/                                     # Node.js + Express Backend
│   ├── package.json                             # Backend dependencies
│   ├── tsconfig.json                            # TypeScript config
│   ├── drizzle.config.ts                        # Drizzle ORM config
│   ├── env.example                              # Environment variables template
│   ├── .gitignore                               # Backend gitignore
│   │
│   ├── src/
│   │   ├── index.ts                             # Server entry point
│   │   ├── app.ts                               # Express app setup
│   │   │
│   │   ├── db/
│   │   │   ├── index.ts                         # Database connection
│   │   │   ├── schema.ts                        # Database schema (Drizzle)
│   │   │   ├── migrate.ts                       # Migration runner
│   │   │   └── seed.ts                          # Database seeding
│   │   │
│   │   ├── middleware/
│   │   │   ├── auth.ts                          # JWT authentication
│   │   │   └── requireRole.ts                   # Role-based access control
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.ts                          # Auth endpoints
│   │   │   ├── passes.ts                        # Pass management endpoints
│   │   │   └── staff.ts                         # Staff endpoints
│   │   │
│   │   ├── services/
│   │   │   ├── passService.ts                   # Pass business logic
│   │   │   └── wallet.ts                        # Apple Wallet pass generation
│   │   │
│   │   └── utils/
│   │       ├── env.ts                           # Environment config
│   │       └── errors.ts                        # Custom error classes
│   │
│   └── assets/
│       └── wallet/
│           ├── icon.png                         # Wallet pass icon (placeholder)
│           ├── logo.png                         # Wallet pass logo (placeholder)
│           ├── icon.png.info                    # Icon info
│           └── logo.png.info                    # Logo info
│
├── mobile/                                      # React Native Mobile App (Expo)
│   ├── package.json                             # Mobile dependencies
│   ├── tsconfig.json                            # TypeScript config
│   ├── app.json                                 # Expo config
│   ├── babel.config.js                          # Babel config
│   ├── App.tsx                                  # App root component
│   ├── .gitignore                               # Mobile gitignore
│   │
│   └── src/
│       ├── api/
│       │   ├── config.ts                        # API base URL config
│       │   └── client.ts                        # Axios client + API functions
│       │
│       ├── auth/
│       │   └── storage.ts                       # Secure token storage
│       │
│       ├── navigation/
│       │   └── AppNavigator.tsx                 # Navigation setup
│       │
│       └── screens/
│           ├── LoginScreen.tsx                  # User login
│           ├── RegisterScreen.tsx               # User registration
│           ├── HomeScreen.tsx                   # Browse/buy passes
│           ├── MyPassesScreen.tsx               # User's passes list
│           ├── PassDetailScreen.tsx             # Pass details + QR + Wallet
│           └── SettingsScreen.tsx               # User settings + logout
│
└── staff-web/                                   # Staff Web App (React + Vite)
    ├── package.json                             # Web app dependencies
    ├── tsconfig.json                            # TypeScript config
    ├── tsconfig.node.json                       # Node TypeScript config
    ├── vite.config.ts                           # Vite config
    ├── index.html                               # HTML entry point
    ├── .gitignore                               # Web app gitignore
    │
    └── src/
        ├── main.tsx                             # React entry point
        ├── App.tsx                              # App root + routing
        │
        ├── api/
        │   └── client.ts                        # Axios client + staff API
        │
        ├── screens/
        │   ├── LoginScreen.tsx                  # Staff login
        │   ├── ScannerScreen.tsx                # QR scanner + validation
        │   └── HistoryScreen.tsx                # Scan history
        │
        └── styles/
            ├── index.css                        # Global styles
            ├── Login.css                        # Login styles
            ├── Scanner.css                      # Scanner styles
            └── History.css                      # History styles
```

## File Counts by Category

### Backend (25 files)
- Configuration: 5 files (package.json, tsconfig, drizzle config, env)
- Database: 4 files (schema, migrations, seed, connection)
- Middleware: 2 files (auth, role check)
- Routes: 3 files (auth, passes, staff)
- Services: 2 files (pass logic, wallet)
- Utils: 2 files (env, errors)
- Core: 2 files (index, app)
- Assets: 4 files (wallet images + info)
- Other: 1 file (.gitignore)

### Mobile (18 files)
- Configuration: 5 files (package.json, tsconfig, app.json, babel, .gitignore)
- Root: 1 file (App.tsx)
- API: 2 files (config, client)
- Auth: 1 file (storage)
- Navigation: 1 file (AppNavigator)
- Screens: 6 files (Login, Register, Home, MyPasses, PassDetail, Settings)

### Staff Web (17 files)
- Configuration: 6 files (package.json, tsconfigs, vite, index.html, .gitignore)
- Root: 2 files (main.tsx, App.tsx)
- API: 1 file (client)
- Screens: 3 files (Login, Scanner, History)
- Styles: 4 files (index, Login, Scanner, History)

### Root (2 files)
- README.md
- .gitignore

## Total: 62 source files (excluding node_modules, build artifacts, .git)

## Key Technologies Used

**Backend:**
- Node.js + Express + TypeScript
- SQLite + better-sqlite3 + Drizzle ORM
- JWT + bcrypt
- Zod validation
- passkit-generator

**Mobile:**
- React Native + Expo
- React Navigation
- Axios + expo-secure-store
- react-native-qrcode-svg
- expo-file-system + expo-sharing

**Staff Web:**
- React + TypeScript + Vite
- React Router
- Axios
- @zxing/browser (QR scanning)
- CSS Modules

## Database Tables

1. users
2. staff_users
3. pass_types
4. user_passes
5. pass_tokens
6. pass_usage_logs

## API Endpoints

### Public
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/staff/login

### User (Authenticated)
- GET /api/pass-types
- POST /api/passes/purchase
- GET /api/passes/me
- GET /api/passes/:id
- GET /api/passes/:id/wallet

### Staff (Authenticated + STAFF role)
- POST /api/staff/scan
- POST /api/staff/consume
- GET /api/staff/history

## Seeded Data

**Pass Types:**
1. WEEKLY - $29.99, 7 days, unlimited
2. MONTHLY - $99.99, 30 days, unlimited
3. TEN_ENTRY - $79.99, 10 entries, 90 days

**Staff User:**
- Email: staff@gym.local
- Password: staff1234

## Run Commands

**Backend:**
```bash
npm install
npm run migrate
npm run seed
npm run dev
```

**Mobile:**
```bash
npm install
npm start
```

**Staff Web:**
```bash
npm install
npm run dev
```
