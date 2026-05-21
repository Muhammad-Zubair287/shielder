# Shielder Platform - Complete Installation Guide

## 📋 System Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 15.0
- **Operating System**: macOS, Linux, or Windows with WSL2

## 🚀 Quick Installation

### Option 1: Automated Setup (Recommended)

```bash
cd /Users/mzubair/Documents/Professional/DevFlx/shielder
chmod +x setup.sh
./setup.sh
```

### Option 2: Manual Setup

#### Step 1: Backend Installation

```bash
cd backend
npm install
cp .env.example .env
```

**Edit `backend/.env` with your configuration:**

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/shielder_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key
FRONTEND_URL=http://localhost:3000
```

**Generate Prisma Client and run migrations:**

```bash
npm run prisma:generate
npm run prisma:migrate
```

**Start the backend:**

```bash
npm run dev
```

Backend will run on **http://localhost:5000**

#### Step 2: Frontend Installation

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

**Edit `frontend/.env.local`:**

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

**Start the frontend:**

```bash
npm run dev
```

Frontend will run on **http://localhost:3000**

## 📦 Using Docker (Alternative)

### Backend with Docker

```bash
cd backend/docker
docker-compose up -d
```

This will start:
- PostgreSQL database on port 5432
- Redis (optional) on port 6379
- Backend API on port 5000

## 🧪 Testing the Setup

### 1. Check Backend Health

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Shielder API is running",
  "timestamp": "2026-02-05T...",
  "environment": "development"
}
```

### 2. Test Registration

Open your browser and go to:
```
http://localhost:3000/register
```

Register a new account with:
- Email: test@example.com
- Password: Test1234 (must include uppercase, lowercase, and number)
- Fill in optional fields

### 3. Test Login

Go to:
```
http://localhost:3000/login
```

Login with your credentials.

## 🗄️ Database Setup

### Creating PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE shielder_db;

# Create user (if needed)
CREATE USER shielder WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE shielder_db TO shielder;

# Exit
\q
```

### Running Migrations

```bash
cd backend
npm run prisma:migrate
```

### Viewing Database with Prisma Studio

```bash
cd backend
npm run prisma:studio
```

This opens a browser interface at **http://localhost:5555**

## 🚢 Deployment

### Frontend Deployment (Vercel)

1. **Push code to GitHub**

2. **Import to Vercel:**
   - Go to https://vercel.com
   - Click "New Project"
   - Import your GitHub repository
   - Set the **Root Directory** to `frontend`
   - Make sure the project is using the Next.js framework preset

3. **Set Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api/v1
   ```

4. **Deploy!**

### Backend Deployment (Railway)

1. **Push code to GitHub**

2. **Create Railway Project:**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add PostgreSQL:**
   - Click "New"
   - Select "Database"
   - Choose "PostgreSQL"

4. **Configure Backend Service:**
   - Click "New"
   - Select "GitHub Repo"
   - Set root directory to `backend`

5. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=your-production-secret-key
   JWT_REFRESH_SECRET=your-production-refresh-secret
   FRONTEND_URL=https://your-app.vercel.app
   ```

6. **Deploy!**

## 🛠️ Troubleshooting

### Common Issues

#### 1. "Cannot connect to database"

**Solution:**
- Check if PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

#### 2. "Module not found" errors

**Solution:**
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 3. "Prisma Client not found"

**Solution:**
```bash
cd backend
npm run prisma:generate
```

#### 4. "CORS errors" in frontend

**Solution:**
- Verify FRONTEND_URL in backend .env matches your frontend URL
- Check NEXT_PUBLIC_API_URL in frontend .env.local

#### 5. Port already in use

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

## 📚 Additional Commands

### Backend Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:studio    # Open Prisma Studio
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

### Frontend Commands

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm start           # Start production server
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint errors
npm run format      # Format code with Prettier
npm run type-check  # Check TypeScript types
```

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change all default secrets in .env
- [ ] Set strong JWT_SECRET and JWT_REFRESH_SECRET
- [ ] Use secure database password
- [ ] Enable HTTPS
- [ ] Set proper CORS origins
- [ ] Review and configure rate limiting
- [ ] Enable database backups
- [ ] Set up monitoring and logging

## 📞 Support

For issues or questions:
- Check the documentation in backend/README.md and frontend/README.md
- Review .cursorrules for coding standards
- Check logs for error messages

## 🎉 Success!

If everything is running:
- ✅ Backend API: http://localhost:5000
- ✅ Frontend App: http://localhost:3000
- ✅ Prisma Studio: http://localhost:5555 (when running)

You're ready to start developing!
