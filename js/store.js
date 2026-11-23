/**
 * Restaurant App - Unified Store & Cloud Sync Layer
 * Secure Cloud Configuration:
 * - Reads from local 'firebase-config.js' (ignored by git via .gitignore)
 * - OR reads from Admin Panel Settings (stored securely in browser localStorage)
 * - ZERO hardcoded API keys in public repository code.
 */

const STORAGE_KEYS = {
  RESTAURANT: 'resturant_info',
  MENU: 'resturant_menu',
  ORDERS: 'resturant_orders',
  FIREBASE_CONFIG: 'resturant_firebase_config',
  ADMIN_SESSION: 'resturant_admin_session'
};

// Initial Sample Menu for First-Time Setup
const DEFAULT_MENU_ITEMS = [
  {
    id: 'item_1',
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 240,
    isVeg: true,
    description: 'Fresh cottage cheese cubes cooked in rich, creamy tomato and cashew butter gravy.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_2',
    name: 'Dal Makhani',
    category: 'Main Course',
    price: 190,
    isVeg: true,
    description: 'Slow-cooked black lentils with fresh cream, butter, and authentic desi spices.',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_3',
    name: 'Crispy Veg Spring Rolls',
    category: 'Starters',
    price: 150,
    isVeg: true,
    description: 'Crisp golden rolls filled with shredded seasonal vegetables served with sweet chili dip.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_4',
    name: 'Paneer Tikka Tandoori',
    category: 'Starters',
    price: 220,
    isVeg: true,
    description: 'Marinated paneer and capsicum skewers grilled in traditional clay oven with mint chutney.',
    image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_5',
    name: 'Butter Naan / Roti Basket',
    category: 'Main Course',
    price: 60,
    isVeg: true,
    description: 'Soft tandoori bread brushed with melted butter and fresh coriander.',
    image: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_6',
    name: 'Dum Biryani (Veg Handi)',
    category: 'Main Course',
    price: 210,
    isVeg: true,
    description: 'Fragrant basmati rice layered with garden vegetables, saffron and fried onions. Served with raita.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_7',
    name: 'Veg Cheese Grilled Burger',
    category: 'Fast Food',
    price: 120,
    isVeg: true,
    description: 'Crispy spiced vegetable patty topped with cheese slice, fresh lettuce, and house mayo.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_8',
    name: 'Peri Peri French Fries',
    category: 'Fast Food',
    price: 99,
    isVeg: true,
    description: 'Hot & crispy golden potato fries tossed in spicy peri peri seasoning.',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_9',
    name: 'Cold Coffee with Ice Cream',
    category: 'Beverages',
    price: 110,
    isVeg: true,
    description: 'Thick and frothy chilled coffee blend topped with a scoop of vanilla ice cream and chocolate drizzle.',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  },
  {
    id: 'item_10',
    name: 'Gulab Jamun (2 Pcs)',
    category: 'Desserts',
    price: 70,
    isVeg: true,
    description: 'Warm, soft milk-solid dumplings soaked in rose and cardamom sugar syrup.',
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=80',
    isAvailable: true
  }
];

class AppStore {
  constructor() {
    this.subscribers = {
      restaurant: [],
      menu: [],
      orders: []
    };

    this.firebaseApp = null;
    this.firestore = null;
    this.isCloudConnected = false;

    // Cross-tab real-time listener (when tabs change on same device)
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        this.notify('orders', this.getOrders());
      } else if (e.key === STORAGE_KEYS.MENU) {
        this.notify('menu', this.getMenu());
      } else if (e.key === STORAGE_KEYS.RESTAURANT) {
        this.notify('restaurant', this.getRestaurant());
      }
    });

    // Auto initialize Cloud Firebase on launch if config is available
    this.initCloud();
  }

  // --- PUB/SUB ---
  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => {
      this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
    };
  }

  notify(event, data) {
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in subscriber for ${event}:`, err);
        }
      });
    }
  }

  // --- RESTAURANT INFO & CREDENTIALS ---
  getRestaurant() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RESTAURANT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading restaurant info:', e);
      return null;
    }
  }

  saveRestaurant(data) {
    const current = this.getRestaurant() || {};
    const updated = {
      ...current,
      ...data,
      isSetupDone: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.RESTAURANT, JSON.stringify(updated));
    this.notify('restaurant', updated);

    // Sync credentials and restaurant profile to Cloud Firestore
    this.syncToCloud('restaurant', updated);
    return updated;
  }

  // --- MENU MANAGEMENT ---
  getMenu() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MENU);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (e) {
      console.error('Error reading menu:', e);
      return [];
    }
  }

  saveMenu(menuItems) {
    localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(menuItems));
    this.notify('menu', menuItems);
    this.syncToCloud('menu', menuItems);
    return menuItems;
  }

  addMenuItem(item) {
    const menu = this.getMenu();
    const newItem = {
      id: 'item_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      name: item.name.trim(),
      category: item.category.trim() || 'General',
      price: parseFloat(item.price) || 0,
      isVeg: item.isVeg !== false,
      description: item.description ? item.description.trim() : '',
      image: item.image && item.image.trim() ? item.image.trim() : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      isAvailable: item.isAvailable !== false,
      createdAt: new Date().toISOString()
    };
    menu.push(newItem);
    this.saveMenu(menu);
    return newItem;
  }

  updateMenuItem(id, updates) {
    const menu = this.getMenu();
    const index = menu.findIndex(i => i.id === id);
    if (index !== -1) {
      menu[index] = { ...menu[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveMenu(menu);
      return menu[index];
    }
    return null;
  }

  deleteMenuItem(id) {
    let menu = this.getMenu();
    menu = menu.filter(i => i.id !== id);
    this.saveMenu(menu);
    return true;
  }

  toggleItemAvailability(id) {
    const menu = this.getMenu();
    const item = menu.find(i => i.id === id);
    if (item) {
      item.isAvailable = !item.isAvailable;
      this.saveMenu(menu);
      return item.isAvailable;
    }
    return null;
  }

  loadDefaultMenu() {
    const existing = this.getMenu();
    if (existing.length === 0) {
      this.saveMenu(DEFAULT_MENU_ITEMS);
    }
  }

  // --- ORDERS MANAGEMENT ---
  getOrders() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (e) {
      console.error('Error reading orders:', e);
      return [];
    }
  }

  createOrder(orderData) {
    const orders = this.getOrders();
    const orderNumber = 100 + orders.length + 1;
    const newOrder = {
      id: `ORD-${orderNumber}`,
      tableNo: String(orderData.tableNo).trim(),
      customerPhone: String(orderData.customerPhone).trim(),
      customerName: orderData.customerName ? String(orderData.customerName).trim() : '',
      items: orderData.items || [],
      totalAmount: parseFloat(orderData.totalAmount) || 0,
      paymentMode: 'CASH', // User specification: Full Cash Mode
      status: 'pending', // 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled'
      placedAt: Date.now(),
      placedAtTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timerSeconds: 300 // 5 Minutes
    };

    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notify('orders', orders);

    // Sync to Cloud Firestore instantly
    this.syncToCloud('orders', orders);

    return newOrder;
  }

  updateOrderStatus(orderId, newStatus) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = newStatus;
      order.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      this.notify('orders', orders);
      this.syncToCloud('orders', orders);
      return order;
    }
    return null;
  }

  // --- ADMIN AUTHENTICATION ---
  verifyAdmin(adminId, pin) {
    const restaurant = this.getRestaurant();
    if (!restaurant) return false;
    const matchId = String(restaurant.adminId || '').trim().toLowerCase() === String(adminId).trim().toLowerCase();
    const matchPin = String(restaurant.adminPin || '').trim() === String(pin).trim();
    if (matchId && matchPin) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify({
        authenticated: true,
        loginTime: Date.now()
      }));
      return true;
    }
    return false;
  }

  isAdminAuthenticated() {
    try {
      const session = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
      if (!session) return false;
      const data = JSON.parse(session);
      return data && data.authenticated === true;
    } catch {
      return false;
    }
  }

  adminLogout() {
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
  }

  // --- SECURE CLOUD FIREBASE CONFIG RESOLUTION ---
  getFirebaseConfig() {
    // 1. Check user-configured config in localStorage (set securely via Admin Settings)
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.apiKey && parsed.apiKey !== 'YOUR_FIREBASE_API_KEY') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Storage config read error:', e);
    }

    // 2. Check window.FIREBASE_CONFIG loaded from local gitignored 'firebase-config.js'
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey && window.FIREBASE_CONFIG.apiKey !== 'YOUR_FIREBASE_API_KEY') {
      return window.FIREBASE_CONFIG;
    }

    // 3. Fallback: No cloud config set (runs offline/local storage safely)
    return null;
  }

  saveFirebaseConfig(config) {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
    this.initCloud();
  }

  async initCloud() {
    const config = this.getFirebaseConfig();
    if (!config || !config.apiKey || !config.projectId) {
      this.isCloudConnected = false;
      return;
    }

    try {
      // Dynamic import of official Firebase SDK modules
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const { getFirestore, doc, setDoc, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

      this.firebaseApp = initializeApp(config);
      this.firestore = getFirestore(this.firebaseApp);
      this.isCloudConnected = true;
      console.log('Firebase Cloud Firestore Connected to project:', config.projectId);

      const restaurantId = config.projectId || 'main_restaurant';

      // 1. Real-Time Listener for Restaurant Info & Admin Credentials
      const infoRef = doc(this.firestore, 'restaurants', restaurantId, 'data', 'info');
      onSnapshot(infoRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudInfo = docSnap.data();
          if (cloudInfo && cloudInfo.isSetupDone) {
            localStorage.setItem(STORAGE_KEYS.RESTAURANT, JSON.stringify(cloudInfo));
            this.notify('restaurant', cloudInfo);
          }
        }
      }, (err) => console.warn('Info listener notice:', err.message));

      // 2. Real-Time Listener for Incoming Orders Across ALL Devices
      const ordersRef = doc(this.firestore, 'restaurants', restaurantId, 'data', 'orders');
      onSnapshot(ordersRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudOrders = docSnap.data().list || [];
          localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cloudOrders));
          this.notify('orders', cloudOrders);
        }
      }, (err) => console.warn('Orders listener notice:', err.message));

      // 3. Real-Time Listener for Menu Items Across ALL Devices
      const menuRef = doc(this.firestore, 'restaurants', restaurantId, 'data', 'menu');
      onSnapshot(menuRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudMenu = docSnap.data().items || [];
          if (cloudMenu.length > 0) {
            localStorage.setItem(STORAGE_KEYS.MENU, JSON.stringify(cloudMenu));
            this.notify('menu', cloudMenu);
          }
        }
      }, (err) => console.warn('Menu listener notice:', err.message));

    } catch (err) {
      console.warn('Firebase Cloud setup notice (using local storage fallback):', err.message);
      this.isCloudConnected = false;
    }
  }

  async syncToCloud(type, data) {
    if (!this.isCloudConnected || !this.firestore) return;
    try {
      const config = this.getFirebaseConfig();
      if (!config) return;
      const restaurantId = config.projectId || 'main_restaurant';
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

      if (type === 'orders') {
        await setDoc(doc(this.firestore, 'restaurants', restaurantId, 'data', 'orders'), { list: data, updatedAt: Date.now() }, { merge: true });
      } else if (type === 'menu') {
        await setDoc(doc(this.firestore, 'restaurants', restaurantId, 'data', 'menu'), { items: data, updatedAt: Date.now() }, { merge: true });
      } else if (type === 'restaurant') {
        await setDoc(doc(this.firestore, 'restaurants', restaurantId, 'data', 'info'), data, { merge: true });
      }
    } catch (e) {
      console.warn('Sync to cloud notice:', e.message);
    }
  }

  // --- BACKUP & EXPORT ---
  exportBackup() {
    return JSON.stringify({
      restaurant: this.getRestaurant(),
      menu: this.getMenu(),
      orders: this.getOrders(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.restaurant) this.saveRestaurant(data.restaurant);
      if (data.menu) this.saveMenu(data.menu);
      if (data.orders) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
        this.notify('orders', data.orders);
        this.syncToCloud('orders', data.orders);
      }
      return true;
    } catch (e) {
      console.error('Import error:', e);
      return false;
    }
  }
}

// Global Store Instance
window.store = new AppStore();
