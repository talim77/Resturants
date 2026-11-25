# Patna Biriyani (Apna Restaurant) — Architecture & Walkthrough

This walkthrough describes the file layout, customer ordering flow, and real-time Firestore admin dashboard in **`talim77/Resturants`**.

---

## Repository Structure

```text
Resturants/
├── index.html                  # Mobile-first customer QR menu, cart drawer & countdown timer
├── admin.html                  # Owner Admin portal (live orders, menu editor & PIN settings)
├── js/
│   ├── store.js                # Shared data store, localStorage fallback & Cloud Firestore sync
│   ├── app.js                  # Customer menu rendering, cart steppers, checkout & 5-min timer
│   └── admin.js                # Real-time order listener, chime/vibrate alerts & menu CRUD
├── css/
│   └── custom.css              # Bottom-sheet transitions, mobile frame & custom styling
├── assets/
│   ├── icon-192.png
│   └── icon-512.png
├── firebase-config.example.js  # Safe Firebase config template
├── manifest.json & sw.js       # Installable Resto Admin PWA manifest & service worker
├── server.ps1                  # Optional local PowerShell HTTP preview script
└── README.md
```

---

## Order & Sync Flow

1. **Customer Scan (`index.html` + `js/app.js`):**
   - Customer scans a table QR code -> browses categorized items -> taps `+ ADD` -> reviews the bottom-sheet cart -> enters Table Number and Mobile Number -> places Cash-on-Table order.
   - A 5-minute countdown bar tracks preparation status in real time.
2. **Cloud Sync (`js/store.js`):**
   - Writes the order document to Cloud Firestore while caching local state for instant responsiveness.
3. **Owner Alert (`admin.html` + `js/admin.js`):**
   - The Admin portal detects the new Firestore order immediately, pops a toast alert, plays an audio chime, vibrates supported mobile devices, and lets the owner mark orders prepared/completed or edit menu items live.
