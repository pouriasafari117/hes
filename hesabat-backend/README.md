# Hesabat Backend — مدیریت صندوق‌ها و مؤسسات مالی

سامانه مدیریت صندوق‌ها، حساب‌ها، پرداخت‌ها و وام‌های مؤسسات مالی. **ثبات، امنیت، و کارایی** در اولویت.

## Features

✓ **اتصال مطمئن**: Retry logic، timeout‌ها، keepAlive برای محیط‌های ابری  
✓ **امنیت**: RLS (Row Level Security)، SECURITY DEFINER functions، JWT، scrypt hashing  
✓ **محاسبات صحیح**: کارمزد درصدی، بلانس‌های پویا، محاسبات وام  
✓ **Offline Detection**: Connection status chip در پنل، graceful degradation  
✓ **Idempotent Schema**: بدون وابستگی به حذف، safe for re-runs  

## Setup

### 1. Database

```bash
# PostgreSQL 12+ مورد نیاز
export DATABASE_URL="postgresql://user:pass@localhost/hesabat"

# Schema را اجرا کنید
psql -d hesabat < db/complete_schema.sql
```

### 2. Environment

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost/hesabat
JWT_SECRET=your-secret-key-min-32-chars-very-secure
JWT_EXPIRES=7d
NODE_ENV=production
PORT=3000
PANEL_PORT=8000
CORS_ORIGIN=http://localhost:8000
```

### 3. Install & Run

```bash
npm install
node server.js           # Backend: port 3000
node panel.js           # Panel: port 8000
```

## API Endpoints

### Auth
- `POST /login` — ورود با username/password
- `POST /logout` — خروج
- `GET /me` — اطلاعات کاربر فعلی

### Institutions
- `GET /institutions` — لیست موسسات کاربر
- `POST /institutions` — ایجاد موسسه جدید
- `GET /institutions/:id` — جزئیات موسسه

### Members
- `GET /institutions/:institutionId/members` — اعضای موسسه
- `POST /institutions/:institutionId/members` — افزودن عضو
- `PATCH /institutions/:institutionId/members/:memberId` — ویرایش عضو

### Payments
- `GET /institutions/:institutionId/payments` — لیست پرداخت‌ها
- `POST /institutions/:institutionId/payments` — ثبت پرداخت
- `PATCH /institutions/:institutionId/payments/:paymentId` — ویرایش

### Health
- `GET /health` — وضعیت Backend

## Architecture

```
hesabat-backend/
├── src/
│   ├── db.js          # Connection pool، withTenant، retry logic
│   ├── auth.js        # JWT، password hashing
│   ├── mw.js          # Middleware (auth، membership check)
│   ├── validate.js    # Input validation (NID، phone، etc)
│   └── routes/        # 10 route files
├── db/
│   ├── complete_schema.sql  # RLS + 16 SECURITY DEFINER functions
│   └── migrations/
├── server.js          # Express app
├── panel.js           # Panel API proxy
├── Panel.html         # UI
└── panel.css          # Styling
```

## Key Improvements

### Connection Resilience
- **Pool Config**: max 10، idleTimeoutMillis 30s، connectionTimeoutMillis 5s
- **Retry Logic**: exponential backoff برای transient errors
- **Event Handlers**: monitoring pool errors
- **PgBouncer Detection**: تشخیص خودکار connection pooler

### Security
- **RLS**: هر موسسه داده‌های خود را در isolation دارد
- **SECURITY DEFINER**: functions برای دسترسی قبل از context
- **JWT Secret Check**: production فقط با secret 32+ char
- **Scrypt Hashing**: N=16384، r=8، p=1

### Payment & Loan Math
- **Fee Calculation**: `amount * (1 + fee_percent / 100)` ✓
- **Loan Payment**: PMT formula (monthly payment = principal * rate / (1 - (1 + rate)^-n))
- **Balance Tracking**: automatic sync with transactions

### API Client (panel.js)
- **20s Timeout**: abort requests after 20s
- **Retry Logic**: 2 retries with exponential backoff
- **Connection Status**: chip in UI showing connection state
- **Offline Detection**: graceful degradation

## Testing

```bash
# Run e2e tests
node test/e2e.js

# Health check
curl http://localhost:3000/health

# Example login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"1234"}'
```

## Monitoring

- Check `/health` endpoint regularly
- Monitor pool errors in server logs
- Watch `srvConnChip` in panel for connection status
- Review transaction logs in PostgreSQL

## Production Notes

1. **JWT Secret**: Set strong secret in environment
2. **CORS Origin**: Restrict to actual domain
3. **SSL/TLS**: Enable for production database
4. **Backups**: Regular PostgreSQL backups
5. **Logs**: Centralize log aggregation
6. **Monitoring**: Set up alerts for pool errors

## License

Private — Hesabat Project
