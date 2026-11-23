# 🍽️ Apna Restaurant - Mobile-First Web App & Admin Portal (PWA)

A lightweight, mobile-first, production-grade Restaurant Menu & Table Ordering Web Application designed for local businesses. It operates completely on **GitHub Pages** (zero-server build requirement) with offline-first local storage and optional real-time **Firebase Cloud Firestore** synchronization.

---

## 🌟 Key Updates & Features

### 📱 1. Mobile-First Phone Screen Architecture (Priority #1)
- Designed specifically for smartphone screens (Swiggy / Zomato / Blinkit style native feel).
- **Food List**: Left side shows Veg/Non-Veg badge, item name, price, and description; right side displays a rounded food image with an overlapping `+ ADD` button that smoothly transforms into a `(-) [qty] (+)` stepper.
- **Sticky Bottom Cart Bar**: Floating summary pill appears when items are added with live bill and one-tap checkout.
- **Native Bottom Sheet Drawer**: Cart drawer slides up from the bottom of the screen like a native mobile app.
- **Order Placement**: Requires **Table Number** & **Mobile Number** (Name is optional), pre-configured for **100% Cash on Table**.
- **5-Minute Countdown Timer**: Live animated countdown timer (`05:00` &rarr; `00:00`) with a progress bar and celebratory notification.

---

### 📲 2. Installable PWA Web App for Restaurant Owners
- Includes `manifest.json`, `sw.js` (Service Worker), and app icons (`assets/icon-192.png`, `assets/icon-512.png`).
- Restaurant owners can install **Resto Admin** directly onto their Android or iOS phone homescreen with 1 tap via the **"Install App"** banner!
- Customers don't need to install anything; they simply scan a table QR code and the web app opens instantly.

---

### ☁️ 3. Real-Time Cloud Sync & Sound Alerts (Secure Configuration)
- **Zero Secrets in Code**: No private Firebase API keys or project IDs are hardcoded in the public repository.
- Uses `firebase-config.js` (protected via `.gitignore`) or direct input via **Admin Panel &rarr; Settings &rarr; Cloud Database**.
- When a customer places an order from their phone on Table 4:
  1. The order is written directly to Cloud Firestore.
  2. The Admin panel on the owner's phone/PC instantly receives the order in real-time.
  3. A melodic **Audio Chime** rings and the owner's phone **vibrates** (`navigator.vibrate`) to alert the kitchen/counter!
- **Anywhere Login**: Admin can log in from ANY phone or computer in the world.
- **Cloud Credential Updates**: The owner can change their **Admin User ID** and **Security PIN** directly inside Admin &rarr; Settings, and it syncs to the cloud immediately!

---

## 🚀 How to Deploy on GitHub Pages

1. **Commit & Push** all files to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: mobile-first redesign, PWA install support, and real-time Firebase sync"
   git push origin main
   ```
2. Open your repository on GitHub: [https://github.com/talim77/Resturants](https://github.com/talim77/Resturants)
3. Go to **Settings** &rarr; **Pages** (in the left sidebar).
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: Select **`main`** and folder **`/(root)`**
   - Click **Save**.
5. Within 1-2 minutes, your website will be live at:
   - **Customer Ordering**: `https://talim77.github.io/Resturants/`
   - **Admin Management Portal**: `https://talim77.github.io/Resturants/admin.html`
