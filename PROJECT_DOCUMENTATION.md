# KisanSetu Project Documentation

KisanSetu is a comprehensive agricultural marketplace designed to bridge the gap between farmers and buyers while providing a robust logistics framework for transporters. The platform focuses on transparency, fair pricing, and trust through AI-driven quality assessment and secure financial transactions.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Maps & GIS**: Leaflet & React-Leaflet
- **Icons**: Lucide React
- **Internationalization**: i18next (English, Hindi, Telugu, Tamil, Kannada)
- **State Management**: Context API (Auth, Language, Toast)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Prisma ORM)
- **Real-time**: Socket.io
- **Authentication**: JWT & Custom Middleware

### Specialized Services
- **AI**: Google Gemini Pro & Vision (for crop grading and verification)
- **Logistics**: OSRM (Open Source Routing Machine) for distance and time estimation
- **Payments**: Escrow-based wallet system

---

## 🏗️ System Architecture

### Overview
The system follows a classic Client-Server architecture with real-time capabilities.
- **Client**: Single Page Application (SPA) built with React.
- **Server**: RESTful API + WebSocket server.
- **Database**: NoSQL MongoDB for flexible schema (Prisma handles relations).

### Folder Structure
```text
KisanSetu/
├── backend/            # Express.js Server
│   ├── src/
│   │   ├── controllers/# Business logic
│   │   ├── routes/     # API endpoints
│   │   ├── services/   # Internal tools (AI, Logistics, Wallets)
│   │   ├── socket.js   # WebSocket event handlers
│   │   └── server.js   # App entry point
│   ├── prisma/         # Schema & Migrations
│   └── scripts/        # Database seeding & utility tools
├── src/                # React Frontend
│   ├── components/     # Reusable UI parts
│   ├── pages/          # Main views (Dashboard, Marketplace, Tracking)
│   ├── services/       # API communication Layer (Axios)
│   ├── context/        # Global state
│   └── hooks/          # Custom React hooks
```

---

## 👥 User Roles & Permissions

- **Farmer**: 
  - List crops for sale.
  - Negotiate with buyers.
  - Use AI for quality verification.
  - Manage orders and withdrawals.
- **Buyer**:
  - Browse marketplace and filter crops.
  - Negotiate prices.
  - Add to cart and manage wishlist.
  - Secure payments via escrow.
  - Arrange delivery or self-pickup.
- **Transporter**:
  - Onboard and verify vehicle details.
  - Receive delivery requests.
  - Provide live tracking for orders.
  - Manage earnings per delivery.
- **Admin**:
  - Moderate users and listings.
  - Review audit logs.
  - Manage system settings.

---

## 🔄 Core Workflows

### 1. Market & Negotiation
- Farmers list crops with images and details.
- Buyers can start a **Negotiating Chat**.
- Real-time bidding system: "Make Offer" -> "Counter" -> "Accept/Reject".
- Accepted offers lock the price and quantity.

### 2. Order & Escrow
- Once an offer is accepted, an `Order` is created.
- Money is moved from the Buyer's wallet (or direct payment) into **Escrow**.
- The listing status changes to `LOCKED` or `IN_DELIVERY`.

### 3. Logistics & Delivery
- **Self-Pickup**: Managed via a 2-step OTP verification between Farmer and Buyer.
- **Arranged Delivery**: Transporters are notified. Once one accepts, they handle pickup and drop-off with OTP verification.
- **Live Tracking**: Transporters share GPS location via WebSockets for real-time map updates.

### 4. Quality Assessment (AI)
- Integrated Gemini Vision analyzes crop images.
- Detects crop type, quality grade, and provides a detailed summary.
- Reduces disputes by providing an objective quality score.

---

## 📦 Database Schema (Prisma)

The project utilizes a complex schema in `backend/prisma/schema.prisma`. Key models include:
- `User`: Base model for all roles.
- `Listing`: Crop offerings by farmers.
- `Order`: Transaction records linking buyers, farmers, and listings.
- `Delivery`: Logistics tracking and status.
- `Wallet` & `Transaction`: Financial records.
- `NegotiatingChat`: Real-time negotiation threads.
- `ImageVerification`: AI-processed crop quality records.

---

## 🛠️ Setup & Integration

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- Google Gemini API Key
- OSRM Server (optional, defaults available)

### Quick Start
1. **Backend**:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npm run start
   ```
2. **Frontend**:
   ```bash
   cd ..
   npm install
   npm run dev
   ```

---

## 🌟 Modern Features
- **OTP-based Verification**: Ensures secure handovers.
- **Dynamic Pricing**: Tied to Mandi prices for fair trade.
- **Responsive UI**: Fully optimized for mobile (PWA ready).
- **Multilingual Support**: Supports 5 major Indian languages.
