# Deployment Guide - Vercel

## Setting up Database Connection

The application requires a PostgreSQL database. You need to add the DATABASE_URL environment variable in Vercel.

### Option 1: Using Vercel Postgres (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to the "Storage" tab
3. Click "Create Database" → Select "Postgres"
4. Follow the setup wizard
5. Vercel will automatically add the DATABASE_URL to your project

### Option 2: Using External PostgreSQL (Supabase, Neon, etc.)

1. Create a PostgreSQL database with your provider of choice:
   - **Supabase**: https://supabase.com (free tier available)
   - **Neon**: https://neon.tech (free tier available)
   - **Railway**: https://railway.app
   - **Render**: https://render.com

2. Get your connection string, which looks like:
   ```
   postgresql://username:password@host:port/database?sslmode=require
   ```

3. Add to Vercel:
   - Go to your Vercel project dashboard
   - Navigate to "Settings" → "Environment Variables"
   - Add new variable:
     - Name: `DATABASE_URL`
     - Value: Your PostgreSQL connection string
     - Environment: Production (and Preview/Development if needed)
   - Click "Save"

### Option 3: Using Local Database (Development Only)

For local development, you can use a local PostgreSQL instance:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/inspection_db?schema=public"
```

## After Setting DATABASE_URL

1. **Redeploy your application**:
   - Go to the "Deployments" tab in Vercel
   - Click the three dots on the latest deployment
   - Select "Redeploy"

2. **Initialize the database**:
   - The database schema will be automatically created on first connection
   - To seed with test data, you can run:
     ```bash
     npm run db:seed
     ```

## Troubleshooting

### "Environment variable not found: DATABASE_URL"
- Ensure the DATABASE_URL is added to Vercel environment variables
- Make sure to redeploy after adding the variable

### Connection timeouts
- If using an external database, ensure it allows connections from Vercel's IP addresses
- Most providers have an option to "Allow connections from anywhere" for serverless deployments

### SSL Connection Issues
- Add `?sslmode=require` to your connection string for secure connections
- Some providers may require `?ssl=true` instead

## Production Checklist

- [ ] DATABASE_URL environment variable is set in Vercel
- [ ] Database allows connections from Vercel
- [ ] SSL is enabled on database connection
- [ ] Application has been redeployed after adding environment variables
- [ ] Database schema has been initialized
- [ ] Test data has been seeded (optional)