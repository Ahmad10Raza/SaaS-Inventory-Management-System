# Deployment Guide for Inventory SaaS (Up to Phase 4)

## Goal

Deploy a working SaaS Inventory Management platform with:

* Authentication
* Company onboarding
* Role-based access
* Product management
* Inventory management
* Vendors
* Customers
* Purchases
* Sales
* Warehouses
* Dashboard

This deployment plan is only for MVP up to Phase 4.

# Recommended Deployment Architecture

```text
Frontend (React + Vite)
↓
Vercel

Backend (Node.js + Express/NestJS)
↓
Render / Railway / AWS EC2

Database
↓
MongoDB Atlas

Images / Files
↓
Cloudinary
```

# Step 1: Prepare Frontend for Production

Frontend should contain:

* React
* TypeScript
* Tailwind
* Axios
* React Router
* Zustand / Redux
* React Query

Create production environment file:

```env
VITE_API_BASE_URL=https://your-backend-url.com/api
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-name
```

Build frontend:

```bash
npm run build
```

Test locally:

```bash
npm run preview
```

# Step 2: Prepare Backend for Production

Backend should contain:

* Node.js
* Express or NestJS
* MongoDB
* JWT Auth
* Role middleware
* Validation
* Error handling
* Logging

Create production environment file:

```env
PORT=5000
NODE_ENV=production
MONGO_URI=your-mongodb-uri
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FRONTEND_URL=https://your-frontend-url.com
```

Add production scripts:

```json
{
  "scripts": {
    "dev": "nodemon src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Build backend:

```bash
npm run build
```

# Step 3: Setup MongoDB Atlas

Create collections:

* companies
* users
* products
* product_variants
* customers
* vendors
* purchases
* sales
* warehouses
* warehouse_stock
* stock_movements
* activity_logs

Enable:

* IP Whitelist
* Database User
* Strong Password
* Backups

# Step 4: Deploy Frontend to Vercel

Steps:

1. Push frontend code to GitHub
2. Login to Vercel
3. Import GitHub repository
4. Add environment variables
5. Deploy

Frontend deployment settings:

```text
Framework Preset = Vite
Build Command = npm run build
Output Directory = dist
```

# Step 5: Deploy Backend to Render

Steps:

1. Push backend code to GitHub
2. Login to Render
3. Create New Web Service
4. Connect repository
5. Add environment variables
6. Deploy

Backend deployment settings:

```text
Build Command = npm install && npm run build
Start Command = npm run start
```

# Step 6: Configure CORS

Backend should allow frontend domain.

Example:

```javascript
app.use(cors({
  origin: ['https://your-frontend-url.vercel.app'],
  credentials: true
}))
```

# Step 7: Configure Cloudinary

Use Cloudinary for:

* Product images
* Company logos
* Invoice uploads
* Barcode images

Store only image URLs in MongoDB.

# Step 8: Add Logging & Error Handling

Use:

* Winston or Pino for logs
* Morgan for request logs
* Global error middleware

Log:

* Login attempts
* Purchase creation
* Sales creation
* Stock changes
* API failures
* Permission errors

# Step 9: Add Security Before Deployment

Must add:

* Helmet
* CORS
* Rate limiting
* Password hashing with bcrypt
* JWT authentication
* Role middleware
* Input validation
* MongoDB sanitization

Install:

```bash
npm install helmet cors express-rate-limit bcrypt jsonwebtoken
```

# Step 10: Production Folder Structure

```text
backend/
  src/
    modules/
    middleware/
    routes/
    services/
    controllers/
    models/
    utils/
    config/
    logs/
    uploads/

frontend/
  src/
    pages/
    components/
    hooks/
    store/
    services/
    routes/
    layouts/
    utils/
```

# Step 11: Important APIs to Verify Before Deployment

Authentication:

* POST /auth/register
* POST /auth/login
* POST /auth/logout

Products:

* GET /products
* POST /products
* PUT /products/:id
* DELETE /products/:id

Inventory:

* GET /inventory
* POST /inventory/add-stock
* POST /inventory/reduce-stock

Purchases:

* GET /purchases
* POST /purchases

Sales:

* GET /sales
* POST /sales

Customers:

* GET /customers
* POST /customers

Vendors:

* GET /vendors
* POST /vendors

Warehouses:

* GET /warehouses
* POST /warehouses

# Step 12: Pre-Deployment Checklist

Before deploying verify:

* All environment variables added
* MongoDB connected
* Images uploading correctly
* Login works
* Role permissions work
* Purchase updates stock
* Sale reduces stock
* Dashboard values correct
* Reports working
* No console errors
* No API errors
* CORS working
* Mobile responsive UI working

# Step 13: Post-Deployment Testing

Test complete workflow:

1. Register company
2. Create warehouse
3. Create vendor
4. Create product
5. Create purchase
6. Verify stock increased
7. Create customer
8. Create sale
9. Verify stock decreased
10. Check dashboard
11. Check reports
12. Check activity logs

# Step 14: Recommended Next Step After Deployment

After Phase 4 deployment, next priorities should be:

* Notifications
* Reports export
* AI assistant
* OCR invoice upload
* Multi-warehouse transfer
* Subscription billing
* Mobile app
* Advanced dashboard widgets
