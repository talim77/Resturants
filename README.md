# Patna Biriyani — Apna Restaurant (Mobile-First QR Menu & Admin PWA)

**Customer Menu App:** [https://talim77.github.io/Resturants/](https://talim77.github.io/Resturants/)  
**Admin Portal:** [https://talim77.github.io/Resturants/admin.html](https://talim77.github.io/Resturants/admin.html)  
**Portfolio Hub:** [https://talim77.github.io/portfolio/](https://talim77.github.io/portfolio/)

A lightweight, mobile-first dine-in restaurant menu, table ordering web app, and installable owner Admin PWA powered by HTML5, Tailwind CSS, JavaScript, and real-time **Firebase Cloud Firestore** synchronization.

---

## Key Features

- **Mobile-First Phone UI (`index.html`):**
  - Swiggy/Zomato-style food cards with Veg/Non-Veg badges, pricing, and animated `+ ADD` / `(-) [qty] (+)` steppers.
  - Sticky floating cart bar, native-style bottom-sheet checkout drawer, Table Number & Mobile checkout, and a 5-minute live order countdown timer.
- **Installable Owner Admin Portal (`admin.html`):**
  - Live incoming order queue with toast popups, melodic Web Audio chimes, and mobile vibration alerts (`navigator.vibrate`).
  - Menu CRUD management, order status updates, and cloud-synced Admin User ID / Security PIN settings.
- **Offline-First + Real-Time Firestore Sync (`js/store.js`):**
  - Syncs live between customer phones and the owner's dashboard via Cloud Firestore, backed by PWA Service Worker caching (`sw.js`).

---

## Setup & Deployment

1. Configure your Firebase web app config in `firebase-config.js` using [`firebase-config.example.js`](firebase-config.example.js) as the template (never commit private API secrets if deploying your own fork).
2. Host statically via **GitHub Pages** (`main` branch, `/(root)`) or run locally using `server.ps1` / any static server.

See [WALKTHROUGH.md](WALKTHROUGH.md) for the code architecture and customer/admin order flow.
