# Exposing KisanSetu with Cloudflare Tunnel

To test WhatsApp Login and Magic Links on mobile devices, you need a public URL. Cloudflare Tunnel is the easiest way to do this for free.

## 1. Prerequisites
You need to have `cloudflared` installed. If you don't have it, download it from [Cloudflare's website](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).

## 2. Start the Tunnels
Open two terminal windows/tabs and run the following:

### Window 1: Frontend (Vite)
```bash
cloudflared tunnel --url http://localhost:5173
```
*Wait for a URL like `https://something-random.trycloudflare.com` to appear. Copy this URL.*

### Window 2: Backend (Express)
```bash
cloudflared tunnel --url http://localhost:5000
```
*Wait for another URL. This is your PUBLIC_API_URL.*

## 3. Update Environment Variables
Once you have the URLs, update your `.env` files:

### Frontend (.env.local)
```env
VITE_API_URL=https://your-backend-tunnel.trycloudflare.com/api
```

### Backend (backend/.env)
```env
# No changes needed unless you have specific callback URLs hardcoded 
# to localhost in Firebase/OTPless dashboard.
```

## 4. Why use this?
- **WhatsApp OTP**: The mobile device needs to reach your "localhost" to verify the OTP.
- **Magic Link**: The link in your email needs to open a URL that points back to your machine.
- **Cross-device testing**: You can open the tunnel URL on your phone to test the real user experience.
