# WooCommerce Analytics Tool - Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- WooCommerce store with REST API enabled
- Vercel account (for deployment)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# WooCommerce API Configuration
WOO_URL=https://your-store.com
WOO_KEY=your_consumer_key
WOO_SECRET=your_consumer_secret

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/woocommerce_analytics"

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Store Configuration
NEXT_PUBLIC_STORE_NAME="My WooCommerce Store"
```

## Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up PostgreSQL database:**
   - Install PostgreSQL locally or use a cloud service
   - Create a database named `woocommerce_analytics`
   - Update the `DATABASE_URL` in your `.env.local` file

3. **Run Prisma migrations:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Access the application:**
   - Open [http://localhost:3000](http://localhost:3000)
   - Sign in with demo credentials or Google OAuth

## WooCommerce API Setup

1. **Enable REST API:**
   - Go to WooCommerce → Settings → Advanced → REST API
   - Click "Add Key"
   - Set permissions to "Read/Write"
   - Copy the Consumer Key and Consumer Secret

2. **Update environment variables:**
   - Set `WOO_URL` to your store URL
   - Set `WOO_KEY` to your Consumer Key
   - Set `WOO_SECRET` to your Consumer Secret

## Authentication Setup

### Demo Credentials
- Email: `admin@example.com`
- Password: `admin123`

### Google OAuth (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)

## Vercel Deployment

### 1. Prepare for Deployment

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Set up production database:**
   - Use Vercel Postgres, Supabase, or any PostgreSQL provider
   - Get the production `DATABASE_URL`

### 2. Deploy to Vercel

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import your repository

2. **Configure Environment Variables:**
   In Vercel dashboard, add these environment variables:
   ```
   WOO_URL=https://your-store.com
   WOO_KEY=your_consumer_key
   WOO_SECRET=your_consumer_secret
   DATABASE_URL=postgresql://username:password@host:port/database
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-production-secret-key
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   NEXT_PUBLIC_STORE_NAME=Your Store Name
   ```

3. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete
   - Run database migrations:
     ```bash
     npx prisma db push
     ```

### 3. Post-Deployment Setup

1. **Update OAuth redirect URIs:**
   - Add your production URL to Google OAuth settings
   - Update `NEXTAUTH_URL` if needed

2. **Test the application:**
   - Visit your deployed URL
   - Test sign-in functionality
   - Test WooCommerce sync

## Database Management

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Create and run migrations
npx prisma migrate dev

# View database in Prisma Studio
npx prisma studio
```

### Production Database Setup

1. **Create production database:**
   ```sql
   CREATE DATABASE woocommerce_analytics;
   ```

2. **Run migrations:**
   ```bash
   npx prisma migrate deploy
   ```

## Troubleshooting

### Common Issues

1. **Database Connection Issues:**
   - Verify `DATABASE_URL` is correct
   - Check database server is running
   - Ensure database exists

2. **WooCommerce API Issues:**
   - Verify API credentials are correct
   - Check store URL is accessible
   - Ensure REST API is enabled

3. **Authentication Issues:**
   - Verify `NEXTAUTH_SECRET` is set
   - Check OAuth redirect URIs
   - Ensure environment variables are correct

### Debug Mode

Enable debug mode by adding to your environment:
```env
NEXTAUTH_DEBUG=true
```

## Security Considerations

1. **Environment Variables:**
   - Never commit `.env.local` to version control
   - Use strong, unique secrets for production
   - Rotate API keys regularly

2. **Database Security:**
   - Use connection pooling
   - Enable SSL connections
   - Restrict database access by IP

3. **Authentication:**
   - Use strong `NEXTAUTH_SECRET`
   - Enable HTTPS in production
   - Consider additional security headers

## Monitoring and Maintenance

1. **Monitor Performance:**
   - Use Vercel Analytics
   - Monitor database performance
   - Track API usage

2. **Regular Updates:**
   - Keep dependencies updated
   - Monitor security advisories
   - Backup database regularly

3. **Scaling:**
   - Monitor database connections
   - Consider connection pooling
   - Implement caching strategies

## Support

For issues and questions:
- Check the troubleshooting section
- Review Vercel deployment logs
- Check Prisma documentation
- Review NextAuth.js documentation

