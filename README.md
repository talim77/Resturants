# 🍽️ Apna Restaurant - Local Business Web App (MVP)

A lightweight, mobile-responsive, production-grade Restaurant Menu & Table Ordering Web Application designed for local businesses. It operates completely on **GitHub Pages** (zero-server build requirement) with offline-first local storage and optional **Firebase Cloud Firestore** real-time synchronization.

---

## 🌟 Key Features

### 👤 Customer Experience
1. **Welcome Landing Page**:
   - Attractive restaurant banner with brand title, tagline, and prominent **"View Menu 🍽️"** button.
   - 3-step easy order guide for customers.
2. **Interactive Menu**:
   - Category filter pills (Starters, Main Course, Fast Food, Biryani, Beverages, Desserts).
   - Real-time search by dish name, description, or ingredient.
   - Veg / Non-Veg badge indicators (🟢 Veg / 🔴 Non-Veg).
   - In-Stock / Sold-Out instant status display.
   - Quick (+) and (&minus;) quantity controls directly on menu cards.
3. **Full Cart & Cash Ordering**:
   - Slide-over cart drawer with complete item breakdown and grand total.
   - **Cash Only Mode**: Pre-configured for dine-in cash collection on table/counter.
   - **Checkout Form**:
     - **Table Number** (`Required`)
     - **Mobile Number** (`Required` - 10 digits)
     - **Customer Name** (`Optional`)
4. **5-Minute Countdown Timer Screen**:
   - Live digital timer counting down from `05:00` with an animated progress bar.
   - Live order summary (Order ID `#ORD-xxx`, Table Number, and cash amount to keep ready).
   - Sound and celebratory notice upon timer completion.

---

### 👨‍🍳 Restaurant Owner / Admin Panel (`admin.html`)
1. **Single Restaurant Security**:
   - Simple, fast **Admin User ID** and **Security PIN** login (no complex OAuth / email needed).
2. **First-Time Setup**:
   - When launched for the first time, prompts for Restaurant Name, Admin ID, and PIN.
   - Option to load 10 delicious starter dishes.
   - **Permanent Setup**: Once submitted, this setup popup is permanently hidden and never shows again.
3. **Live Orders Management**:
   - Real-time order stream showing Table No., Customer Phone & Name, Items list, and Total Bill.
   - Live status workflow with 1-click updates:
     - 🟡 **Pending** &rarr; 🍳 **In Kitchen (Preparing)** &rarr; 🍽️ **Ready / Served** &rarr; ✅ **Cash Collected (Completed)**.
   - Real-time audio notification chime for incoming orders using the Web Audio API.
   - 🖨️ Thermal printer-friendly KOT / Cash receipt printing directly from the browser.
4. **Menu Editor**:
   - Add new food items with name, category, price, veg/non-veg status, description, and image URL.
   - Edit prices or food details instantly.
   - 1-Click **"In Stock" / "Out of Stock"** toggle during busy hours.
   - Delete items with confirmation.
5. **Settings & Cloud Sync**:
   - Update restaurant details and credentials anytime.
   - **Firebase Cloud Firestore**: Optional 1-click cloud sync so orders sync in real-time across multiple customer phones and owner devices.
   - One-click JSON data backup and restore.

---

## 🚀 How to Deploy on GitHub Pages (Free Hosting)

Since this app is built with pure, modern HTML5, Tailwind CSS, and ES Modules, it requires **zero build commands or backend servers**.

1. **Commit & Push** all files to your GitHub repository:
   ```bash
   git add .
   git commit -m "Launch Restaurant MVP Website"
   git push origin main
   ```
2. Open your repository on GitHub: [https://github.com/talim77/Resturants](https://github.com/talim77/Resturants)
3. Go to **Settings** &rarr; **Pages** (in the left sidebar).
4. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: Select **`main`** and folder **`/(root)`**
   - Click **Save**.
5. Within 1-2 minutes, your website will be live at:
   ```
   https://talim77.github.io/Resturants/
   ```
6. Admin Panel will be accessible at:
   ```
   https://talim77.github.io/Resturants/admin.html
   ```

---

## ☁️ Setting Up Cloud Database (Firebase Firestore)

By default, the app stores everything safely in the browser's persistent storage (and syncs across all tabs on the same computer in real-time).

To enable multi-device sync across different mobile phones:
1. Go to [Firebase Console](https://console.firebase.google.com/) and create a free project.
2. Click **Build &rarr; Firestore Database** and click **Create database** (Test mode or Production mode).
3. Click the Web icon `</>` in project overview to register a web app and copy the `firebaseConfig` object:
   ```json
   {
     "apiKey": "AIzaSy...",
     "authDomain": "your-app.firebaseapp.com",
     "projectId": "your-app-id",
     "storageBucket": "your-app.appspot.com",
     "messagingSenderId": "123456789",
     "appId": "1:123456789:web:abcdef"
   }
   ```
4. Open the **Admin Panel** &rarr; **Settings & Cloud DB**, paste the JSON, and click **Connect Cloud DB**.
5. All customer orders and menu updates will now sync across the internet in real-time!

---

## 💻 Local Testing

Simply double-click `index.html` to open it in your browser, or run a lightweight local server:

```powershell
# Using Python (if installed)
python -m http.server 8000

# Or open directly
Start-Process "index.html"
```
