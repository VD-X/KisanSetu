<div align="center">

# KisanSetu 🌾
### AI-powered farmer marketplace with real-time negotiation & delivery management

</div>

## Overview
**KisanSetu** is a farmer-first marketplace where farmers can publish crop listings, buyers can purchase crops, and transporters can accept delivery deals. The system supports role-based dashboards, real-time delivery updates via WebSockets, and AI-assisted crop quality grading from images.

---

## Key Features

### Farmer
- Create unlimited crop listings (stored in DB)
- Upload harvest photos and get **AI-decided quality grade** (not editable)
- Add **harvest date** before publishing
- View orders and **arrange delivery** when buyer selects *Farmer Arranged*
- Share **Pickup OTP** with transporter for pickup verification

### Buyer
- Browse all available listings with farmer details
- Add items to cart, place orders, cart clears automatically after checkout
- Track delivery timeline and share **Delivery OTP** with transporter at delivery
- View order history

### Transporter
- View available delivery deals with crop + route + earnings
- Accept or decline deals
- Verify **Pickup OTP** (from farmer) → status becomes **PICKED_UP**
- Verify **Delivery OTP** (from buyer) → delivery becomes **COMPLETED**

### Real-time
- WebSocket events for delivery creation/accept/otp/status updates

---

## Tech Stack
**Frontend**
- React + TypeScript
- Vite
- TailwindCSS
- socket.io-client

**Backend**
- Node.js + Express
- Prisma (MongoDB)
- JWT Authentication
- socket.io

---

## Project Structure


---

## Setup (Local Development)

### 1) Clone
```bash
git clone https://github.com/codewithManikanta/KisanSetu.git
cd KisanSetu
```

### 2) Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env` (example)
```env
PORT=5000
JWT_SECRET=your_secret_here
FRONTEND_URL=http://localhost:5173
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority"
```

Run backend:
```bash
npm run dev
```

### 3) Frontend Setup
```bash
cd ..
npm install
```

Create `.env.local` (example)
```env
VITE_API_URL=http://localhost:5000
VITE_GEMINI_API_KEY=your_gemini_key_here
```

Run frontend:
```bash
npm run dev
```

App URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

---

## Important Notes
- **OTP Security**
  - Farmer sees only **Pickup OTP**
  - Buyer sees only **Delivery OTP**
  - Transporter never receives OTPs via APIs; OTP is entered manually on verification
- **Listing Quantity**
  - Quantity reduces only at checkout / order creation
  - If quantity hits `0`, listing becomes `SOLD`

---

## API Highlights
- Listings: `GET /api/listings`, `POST /api/listings`, `GET /api/listings/my/listings`
- Cart: `POST /api/cart/add`, `POST /api/cart/checkout`
- Orders: `GET /api/orders`
- Delivery Deals:
  - Create: `POST /api/delivery-deals/create`
  - Transporter deals: `GET /api/delivery-deals/available`
  - Accept/Decline: `POST /api/delivery-deals/:id/accept`, `POST /api/delivery-deals/:id/decline`
  - Verify OTP: `POST /api/delivery-deals/:id/verify-otp`

---

## Screens / Demo
Add screenshots or demo video links here.

---

## License
MIT (or update as needed)
