# Tech Stack: SaaS Inventory Management System

This document outlines the technologies, frameworks, and libraries used to build and maintain the SaaS Inventory Management System (Version 1.0).

---

## 💻 Frontend Architecture
Built for speed, developer experience, and a highly interactive User Interface.

* **Core Framework:** React 18
* **Build Tool:** Vite (with SWC compiler for rapid compilation)
* **Language:** TypeScript (Strict typing)
* **Routing:** React Router v6
* **State Management:** 
  * **Zustand:** For global client UI state (e.g., Auth Store, UI toggles)
  * **React Query (@tanstack/react-query):** For server state synchronization, caching, and async data mutations
* **Styling & UI:** 
  * **Tailwind CSS:** Utility-first CSS framework
  * **Radix UI:** Accessible, headless UI primitives
  * **Lucide React:** Icon library
* **Forms & Validation:** 
  * **React Hook Form:** Performant, flexible form handling
  * **Zod:** Schema-based validation
* **Notifications:** React Hot Toast / Sonner

---

## ⚙️ Backend Architecture
Built for scalability, strict architecture patterns, and tenant data isolation.

* **Core Framework:** NestJS (Node.js framework for scalable server-side apps)
* **Language:** TypeScript
* **Database Object Modeling:** Mongoose
* **Authentication & Security:** 
  * **Passport.js:** JWT Bearer Token Strategy
  * **bcrypt:** Password hashing
  * **Helmet:** HTTP header security
* **Multi-Tenant Architecture:**
  * Custom `TenantConnectionService` that dynamically opens and caches isolated database connections per company (Database-per-tenant pattern).
* **Emails:** Nodemailer (SMTP transport)

---

## 🗄️ Database & Storage
* **Primary Database:** MongoDB (Hosted on MongoDB Atlas)
* **Data Isolation Model:** Database-per-tenant. (A `saas_master` database tracks organizations, and dynamic `inv_{tenant_slug}` databases store isolated tenant data).
* **Media / Documents:** Cloudinary or AWS S3 (for Image and Document uploads)

---

## 🚀 Deployment & DevOps
* **Frontend Hosting:** Vercel / Netlify
* **Backend Hosting:** Render / Railway / AWS / DigitalOcean
* **Version Control:** Git & GitHub
* **Environment Configuration:** `dotenv` / NestJS ConfigModule
