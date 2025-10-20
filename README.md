# Zido E-commerce Tool

A comprehensive WooCommerce analytics and management dashboard built with Next.js, Prisma, and TailwindCSS.

## 🚀 Features

- **Multi-Store Management**: Connect and manage multiple WooCommerce stores
- **Real-time Analytics**: Dashboard with revenue, orders, and customer insights
- **Data Synchronization**: Background sync with progress tracking
- **Marketing Attribution**: Track UTM parameters and campaign performance
- **Secure Authentication**: NextAuth.js with Google OAuth support
- **Encrypted Credentials**: AES-256 encryption for WooCommerce API keys
- **Responsive Design**: Modern UI with TailwindCSS and shadcn/ui

## 📊 Dashboard Features

- **KPI Cards**: Total revenue, orders count, customers count
- **Charts**: Revenue over time, top products, customer analytics
- **Reports**: Detailed order, product, and customer reports
- **Filters**: Date range filtering and store-specific data
- **Real-time Sync**: Background data synchronization with progress bar

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Styling**: TailwindCSS, shadcn/ui components
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Authentication**: NextAuth.js
- **Charts**: Recharts
- **Encryption**: Node.js crypto (AES-256-CBC)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- WooCommerce store with REST API enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zido-ecom-tool.git
   cd zido-ecom-tool
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret"
   DATA_KEY="your-64-character-hex-encryption-key"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Create a user**
   ```bash
   npx ts-node src/scripts/create-user.ts
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage

1. **Sign In**: Use the credentials from the created user
2. **Add Store**: Go to `/stores/new` and add your WooCommerce store
3. **Sync Data**: Click "Sync Data" to import orders, products, and customers
4. **View Analytics**: Check the dashboard for insights and reports

## 🔧 Configuration

### WooCommerce API Setup

1. Go to your WooCommerce admin panel
2. Navigate to WooCommerce → Settings → Advanced → REST API
3. Create a new API key with Read permissions
4. Use the Consumer Key and Consumer Secret in the store setup

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Yes |
| `DATA_KEY` | Encryption key for credentials | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | No |

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── stores/            # Store management
│   └── auth/              # Authentication
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── contexts/             # React contexts
├── lib/                  # Utilities and configurations
└── scripts/             # Database scripts
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Manual Deployment

1. Build the application
   ```bash
   npm run build
   ```

2. Set up production database (PostgreSQL)
3. Configure environment variables
4. Deploy to your preferred platform

## 🔒 Security

- WooCommerce credentials are encrypted using AES-256-CBC
- NextAuth.js handles secure authentication
- API routes are protected with session validation
- Environment variables are properly secured

## 📈 Features Roadmap

- [ ] Advanced reporting and exports
- [ ] Email notifications
- [ ] Multi-user support
- [ ] API rate limiting
- [ ] Data backup and restore
- [ ] Mobile app support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/zido-ecom-tool/issues) page
2. Create a new issue with detailed information
3. Contact the maintainers

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing framework
- [Prisma](https://prisma.io/) for database management
- [TailwindCSS](https://tailwindcss.com/) for styling
- [shadcn/ui](https://ui.shadcn.com/) for components
- [WooCommerce](https://woocommerce.com/) for the e-commerce platform
