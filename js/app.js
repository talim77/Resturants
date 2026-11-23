/**
 * Customer Frontend Logic - App.js (Mobile-First Architecture)
 * Handles: First-time setup, Welcome page, Mobile Swiggy-style Menu browsing,
 * Search/Filter, Bottom Sheet Cart, Checkout, and 5-min Timer.
 */

const CART_KEY = 'resturant_customer_cart';
const ACTIVE_ORDER_KEY = 'resturant_active_order';

class RestaurantApp {
  constructor() {
    this.cart = this.loadCart();
    this.activeCategory = 'ALL';
    this.vegFilter = 'ALL'; // 'ALL', 'VEG', 'NON_VEG'
    this.searchQuery = '';
    this.timerInterval = null;

    this.init();
  }

  init() {
    // Check first-time setup
    this.checkSetup();

    // Event listeners for store changes
    store.subscribe('restaurant', () => this.renderHeaderAndWelcome());
    store.subscribe('menu', () => this.renderMenu());

    // Listen to hash changes for smooth navigation
    window.addEventListener('hashchange', () => this.handleRouting());

    // Setup UI event listeners
    this.setupEventListeners();

    // Check if there is an active order countdown to resume
    this.checkActiveOrderTimer();

    // Initial render
    this.handleRouting();
    this.renderHeaderAndWelcome();
    this.renderMenu();
    this.updateCartUI();
  }

  // --- FIRST-TIME SETUP CHECK ---
  checkSetup() {
    const restaurant = store.getRestaurant();
    const setupModal = document.getElementById('setup-modal');
    if (!restaurant || !restaurant.isSetupDone) {
      if (setupModal) {
        setupModal.classList.remove('hidden');
        setupModal.classList.add('flex');
      }
    } else {
      if (setupModal) {
        setupModal.classList.add('hidden');
        setupModal.classList.remove('flex');
      }
    }
  }

  completeSetup(e) {
    e.preventDefault();
    const nameInput = document.getElementById('setup-res-name');
    const adminIdInput = document.getElementById('setup-admin-id');
    const pinInput = document.getElementById('setup-admin-pin');
    const loadSampleCheckbox = document.getElementById('setup-load-samples');

    const name = nameInput.value.trim();
    const adminId = adminIdInput.value.trim();
    const pin = pinInput.value.trim();

    if (!name) {
      alert('Kripya Restaurant ka naam enter karein!');
      nameInput.focus();
      return;
    }
    if (!adminId) {
      alert('Kripya Admin User ID enter karein!');
      adminIdInput.focus();
      return;
    }
    if (!pin || pin.length < 3) {
      alert('Kripya kam se kam 3-4 digit ka Admin PIN rakhein!');
      pinInput.focus();
      return;
    }

    // Save restaurant settings
    store.saveRestaurant({
      name: name,
      tagline: 'Fresh Flavors & Authentic Hospitality',
      adminId: adminId,
      adminPin: pin,
      currency: '₹',
      tableCount: 15
    });

    // Optionally load starter menu
    if (loadSampleCheckbox && loadSampleCheckbox.checked) {
      store.loadDefaultMenu();
    }

    // Hide setup modal permanently
    const setupModal = document.getElementById('setup-modal');
    if (setupModal) {
      setupModal.classList.add('hidden');
      setupModal.classList.remove('flex');
    }

    // Go to welcome page
    window.location.hash = '#welcome';
    this.renderHeaderAndWelcome();
    this.renderMenu();
  }

  // --- ROUTING ---
  handleRouting() {
    const hash = window.location.hash || '#welcome';
    const welcomeSection = document.getElementById('welcome-section');
    const menuSection = document.getElementById('menu-section');
    const orderSuccessSection = document.getElementById('order-success-section');

    // Default view states
    if (welcomeSection) welcomeSection.classList.add('hidden');
    if (menuSection) menuSection.classList.add('hidden');
    if (orderSuccessSection) orderSuccessSection.classList.add('hidden');

    if (hash === '#menu') {
      if (menuSection) menuSection.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hash === '#order-confirmed') {
      if (orderSuccessSection) orderSuccessSection.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Default to welcome
      if (welcomeSection) welcomeSection.classList.remove('hidden');
    }

    this.updateCartUI();
  }

  // --- RENDER WELCOME & BRANDING ---
  renderHeaderAndWelcome() {
    const restaurant = store.getRestaurant();
    const resName = restaurant && restaurant.name ? restaurant.name : 'Apna Restaurant';
    const resTagline = restaurant && restaurant.tagline ? restaurant.tagline : 'Taste that feels like home';

    // Update Brand Titles
    document.querySelectorAll('.brand-name').forEach(el => el.textContent = resName);
    document.querySelectorAll('.brand-tagline').forEach(el => el.textContent = resTagline);
    document.title = `${resName} - Mobile Order`;
  }

  // --- MENU RENDERING (Swiggy / Zomato Mobile App Style) ---
  renderMenu() {
    const menuContainer = document.getElementById('menu-items-grid');
    const categoryTabsContainer = document.getElementById('category-tabs');
    if (!menuContainer) return;

    const allItems = store.getMenu();

    // If menu is empty
    if (allItems.length === 0) {
      menuContainer.innerHTML = `
        <div class="text-center py-12 px-4 bg-white rounded-2xl border border-stone-200">
          <span class="text-3xl mb-2 block">🍽️</span>
          <h3 class="text-sm font-bold text-stone-800 mb-1">Menu Abhi Khali Hai</h3>
          <p class="text-stone-500 text-xs mb-4">Admin panel me naye items add karein.</p>
          <a href="admin.html" class="inline-flex px-4 py-2 bg-orange-600 text-white font-bold text-xs rounded-xl shadow">
            Admin Panel Open Karein &rarr;
          </a>
        </div>
      `;
      return;
    }

    // Extract dynamic categories
    const categories = ['ALL', ...new Set(allItems.map(i => i.category || 'General'))];

    // Render Category Filter Pills
    if (categoryTabsContainer) {
      categoryTabsContainer.innerHTML = categories.map(cat => {
        const isActive = this.activeCategory === cat;
        return `
          <button 
            onclick="app.setCategory('${cat}')"
            class="whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold transition ${
              isActive 
                ? 'bg-orange-600 text-white shadow-xs' 
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }"
          >
            ${cat === 'ALL' ? 'All' : cat}
          </button>
        `;
      }).join('');
    }

    // Filter Items
    let filteredItems = allItems.filter(item => {
      if (this.activeCategory !== 'ALL' && item.category !== this.activeCategory) return false;
      if (this.vegFilter === 'VEG' && !item.isVeg) return false;
      if (this.vegFilter === 'NON_VEG' && item.isVeg) return false;
      if (this.searchQuery.trim() !== '') {
        const q = this.searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesCat = (item.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });

    if (filteredItems.length === 0) {
      menuContainer.innerHTML = `
        <div class="text-center py-10 px-4 bg-white rounded-2xl border border-stone-200">
          <p class="text-2xl mb-1">🔍</p>
          <h4 class="text-xs font-bold text-stone-800">Koi item nahi mila</h4>
          <p class="text-stone-400 text-[11px] mt-0.5">Doosra keyword search karein.</p>
        </div>
      `;
      return;
    }

    // Swiggy-Style Horizontal Card Layout
    menuContainer.innerHTML = filteredItems.map(item => {
      const cartItem = this.cart.find(c => c.id === item.id);
      const qtyInCart = cartItem ? cartItem.quantity : 0;
      const isAvailable = item.isAvailable !== false;

      return `
        <div class="bg-white rounded-2xl border border-stone-200/80 p-3.5 shadow-2xs flex items-center justify-between gap-3 ${!isAvailable ? 'opacity-50 grayscale-[40%]' : ''}">
          <!-- Left Content: Veg Badge, Title, Price, Description -->
          <div class="flex-1 min-w-0 pr-1">
            <div class="flex items-center gap-1.5 mb-1">
              <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'} flex-shrink-0"></span>
              <span class="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">${item.category}</span>
            </div>

            <h4 class="text-sm font-bold text-stone-900 leading-snug truncate mb-0.5">
              ${item.name}
            </h4>

            <p class="text-sm font-black text-stone-900 mb-1">
              ₹${item.price}
            </p>

            <p class="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
              ${item.description || 'Delicious freshly prepared dish.'}
            </p>
          </div>

          <!-- Right Content: Food Image + Floating ADD Button -->
          <div class="relative w-24 h-24 flex-shrink-0 flex flex-col items-center">
            <img 
              src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'}" 
              alt="${item.name}" 
              loading="lazy"
              class="w-24 h-24 rounded-2xl object-cover bg-stone-100 border border-stone-200/90 shadow-2xs"
              onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'"
            />

            <!-- Overlapping ADD / Stepper Button -->
            <div class="absolute -bottom-2 z-10 w-20">
              ${!isAvailable ? `
                <span class="block text-center py-1 bg-stone-200 text-stone-500 font-bold text-[9px] rounded-lg shadow-sm border border-stone-300">
                  Sold Out
                </span>
              ` : qtyInCart > 0 ? `
                <div class="flex items-center justify-between bg-white border border-orange-500 rounded-xl shadow-md overflow-hidden text-orange-600 font-extrabold text-xs">
                  <button 
                    onclick="app.updateCartQty('${item.id}', -1)"
                    class="w-6 h-6 flex items-center justify-center hover:bg-orange-50 active:scale-90 transition font-bold"
                  >
                    &minus;
                  </button>
                  <span class="w-6 text-center text-xs font-black text-stone-900">${qtyInCart}</span>
                  <button 
                    onclick="app.updateCartQty('${item.id}', 1)"
                    class="w-6 h-6 flex items-center justify-center hover:bg-orange-50 active:scale-90 transition font-bold"
                  >
                    +
                  </button>
                </div>
              ` : `
                <button 
                  onclick="app.addToCart('${item.id}')"
                  class="w-full py-1 bg-white hover:bg-orange-50 border border-orange-500 text-orange-600 font-black text-[11px] rounded-xl shadow-md transition active:scale-95 text-center flex items-center justify-center gap-1"
                >
                  <span>ADD</span>
                  <span class="text-orange-500">+</span>
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- FILTERS & SEARCH ---
  setCategory(category) {
    this.activeCategory = category;
    this.renderMenu();
  }

  setVegFilter(filter) {
    this.vegFilter = filter;
    document.querySelectorAll('.veg-filter-btn').forEach(btn => {
      const type = btn.getAttribute('data-filter');
      if (type === filter) {
        btn.classList.add('bg-stone-900', 'text-white');
        btn.classList.remove('bg-stone-100', 'text-stone-700');
      } else {
        btn.classList.remove('bg-stone-900', 'text-white');
        btn.classList.add('bg-stone-100', 'text-stone-700');
      }
    });
    this.renderMenu();
  }

  setSearch(query) {
    this.searchQuery = query;
    this.renderMenu();
  }

  // --- CART MANAGEMENT ---
  loadCart() {
    try {
      const data = localStorage.getItem(CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(this.cart));
    this.updateCartUI();
    this.renderMenu();
  }

  addToCart(itemId) {
    const allItems = store.getMenu();
    const item = allItems.find(i => i.id === itemId);
    if (!item || item.isAvailable === false) return;

    const existing = this.cart.find(c => c.id === itemId);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        isVeg: item.isVeg,
        image: item.image,
        quantity: 1
      });
    }

    this.saveCart();
    this.animateCartPill();
  }

  updateCartQty(itemId, delta) {
    const item = this.cart.find(c => c.id === itemId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(c => c.id !== itemId);
    }

    this.saveCart();
  }

  removeFromCart(itemId) {
    this.cart = this.cart.filter(c => c.id !== itemId);
    this.saveCart();
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getCartCount() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
  }

  updateCartUI() {
    const totalCount = this.getCartCount();
    const totalPrice = this.getCartTotal();

    const floatingCartBar = document.getElementById('floating-cart-bar');
    const cartCountBadges = document.querySelectorAll('.cart-count-badge');
    const cartTotalDisplays = document.querySelectorAll('.cart-total-price');
    const cartItemsList = document.getElementById('cart-drawer-items');
    const emptyCartState = document.getElementById('cart-empty-state');
    const cartCheckoutSection = document.getElementById('cart-checkout-section');

    cartCountBadges.forEach(el => el.textContent = totalCount);
    cartTotalDisplays.forEach(el => el.textContent = `₹${totalPrice}`);

    // Floating bar visibility on mobile
    if (floatingCartBar) {
      if (totalCount > 0 && window.location.hash === '#menu') {
        floatingCartBar.classList.remove('hidden');
        floatingCartBar.classList.add('flex');
      } else {
        floatingCartBar.classList.add('hidden');
        floatingCartBar.classList.remove('flex');
      }
    }

    // Render Drawer Items
    if (cartItemsList && emptyCartState && cartCheckoutSection) {
      if (this.cart.length === 0) {
        cartItemsList.innerHTML = '';
        emptyCartState.classList.remove('hidden');
        cartCheckoutSection.classList.add('hidden');
      } else {
        emptyCartState.classList.add('hidden');
        cartCheckoutSection.classList.remove('hidden');

        cartItemsList.innerHTML = this.cart.map(item => `
          <div class="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
            <div class="flex items-center gap-2 min-w-0 pr-2">
              <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'} flex-shrink-0"></span>
              <div class="truncate">
                <h5 class="font-bold text-stone-900 truncate">${item.name}</h5>
                <p class="text-[10px] text-stone-500">₹${item.price} each</p>
              </div>
            </div>

            <div class="flex items-center gap-2.5 flex-shrink-0">
              <!-- Qty Stepper -->
              <div class="inline-flex items-center bg-white border border-stone-200 rounded-lg shadow-2xs">
                <button 
                  onclick="app.updateCartQty('${item.id}', -1)"
                  class="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-orange-600 font-bold"
                >
                  &minus;
                </button>
                <span class="w-5 text-center font-bold text-[11px] text-stone-800">${item.quantity}</span>
                <button 
                  onclick="app.updateCartQty('${item.id}', 1)"
                  class="w-6 h-6 flex items-center justify-center text-stone-600 hover:text-orange-600 font-bold"
                >
                  +
                </button>
              </div>

              <!-- Line item total -->
              <span class="font-extrabold text-stone-900 w-12 text-right">₹${item.price * item.quantity}</span>

              <!-- Delete -->
              <button 
                onclick="app.removeFromCart('${item.id}')" 
                class="text-stone-400 hover:text-red-500 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        `).join('');
      }
    }
  }

  animateCartPill() {
    const floatingBar = document.getElementById('floating-cart-bar');
    if (floatingBar) {
      floatingBar.classList.add('pulse-border');
      setTimeout(() => floatingBar.classList.remove('pulse-border'), 1200);
    }
  }

  // --- BOTTOM SHEET CART DRAWER TOGGLES ---
  openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      backdrop.classList.remove('hidden');
      drawer.classList.remove('translate-y-full');
      this.updateCartUI();
    }
  }

  closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('translate-y-full');
      setTimeout(() => backdrop.classList.add('hidden'), 250);
    }
  }

  // --- ORDER PLACEMENT FLOW (CASH ONLY) ---
  placeOrder(e) {
    if (e) e.preventDefault();

    if (this.cart.length === 0) {
      alert('Aapka cart khali hai!');
      return;
    }

    const tableInput = document.getElementById('order-table-no');
    const phoneInput = document.getElementById('order-phone');
    const nameInput = document.getElementById('order-customer-name');

    const tableNo = tableInput ? tableInput.value.trim() : '';
    const phone = phoneInput ? phoneInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!tableNo) {
      alert('Kripya apna Table Number zaroor enter karein!');
      tableInput.focus();
      return;
    }

    if (!phone || phone.length < 10) {
      alert('Kripya 10-digit valid Mobile Number enter karein!');
      phoneInput.focus();
      return;
    }

    const totalAmount = this.getCartTotal();

    // Create Order in Store (syncs to Cloud Firestore stockora-77)
    const newOrder = store.createOrder({
      tableNo: tableNo,
      customerPhone: phone,
      customerName: name,
      items: [...this.cart],
      totalAmount: totalAmount
    });

    // Save Active Order locally with timestamp for 5-min timer
    const activeOrderData = {
      orderId: newOrder.id,
      tableNo: newOrder.tableNo,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      items: newOrder.items,
      totalAmount: newOrder.totalAmount,
      placedAt: Date.now(),
      durationSeconds: 300 // 5 minutes
    };
    localStorage.setItem(ACTIVE_ORDER_KEY, JSON.stringify(activeOrderData));

    // Clear Cart
    this.clearCart();
    this.closeCartDrawer();

    // Reset Form Fields
    if (tableInput) tableInput.value = '';
    if (phoneInput) phoneInput.value = '';
    if (nameInput) nameInput.value = '';

    // Navigate to Order Confirmed View
    window.location.hash = '#order-confirmed';
    this.startOrderTimer(activeOrderData);
  }

  // --- 5-MINUTE COUNTDOWN TIMER ---
  checkActiveOrderTimer() {
    try {
      const raw = localStorage.getItem(ACTIVE_ORDER_KEY);
      if (!raw) return;
      const activeOrder = JSON.parse(raw);
      const elapsedSeconds = Math.floor((Date.now() - activeOrder.placedAt) / 1000);
      if (elapsedSeconds < activeOrder.durationSeconds) {
        if (window.location.hash === '#order-confirmed') {
          this.startOrderTimer(activeOrder);
        }
      } else {
        if (window.location.hash === '#order-confirmed') {
          this.showTimerFinishedUI(activeOrder);
        }
      }
    } catch (e) {
      console.error('Error checking active order timer:', e);
    }
  }

  startOrderTimer(activeOrder) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const orderIdDisplay = document.getElementById('confirmed-order-id');
    const orderTableDisplay = document.getElementById('confirmed-table-no');
    const orderAmountDisplay = document.getElementById('confirmed-total-amount');
    const orderItemsList = document.getElementById('confirmed-items-list');

    if (orderIdDisplay) orderIdDisplay.textContent = activeOrder.orderId;
    if (orderTableDisplay) orderTableDisplay.textContent = `Table ${activeOrder.tableNo}`;
    if (orderAmountDisplay) orderAmountDisplay.textContent = `₹${activeOrder.totalAmount}`;

    if (orderItemsList) {
      orderItemsList.innerHTML = activeOrder.items.map(i => `
        <li class="flex justify-between text-[11px] py-0.5 text-stone-600 border-b border-stone-100 last:border-0">
          <span>${i.name} &times; ${i.quantity}</span>
          <span class="font-bold text-stone-900">₹${i.price * i.quantity}</span>
        </li>
      `).join('');
    }

    const timerDisplay = document.getElementById('countdown-timer-display');
    const timerProgressBar = document.getElementById('timer-progress-bar');

    const updateTick = () => {
      const elapsedSeconds = Math.floor((Date.now() - activeOrder.placedAt) / 1000);
      const remainingSeconds = Math.max(0, activeOrder.durationSeconds - elapsedSeconds);

      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (timerDisplay) {
        timerDisplay.textContent = formattedTime;
      }

      if (timerProgressBar) {
        const percent = Math.min(100, (elapsedSeconds / activeOrder.durationSeconds) * 100);
        timerProgressBar.style.width = `${percent}%`;
      }

      if (remainingSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.showTimerFinishedUI(activeOrder);
      }
    };

    updateTick();
    this.timerInterval = setInterval(updateTick, 1000);
  }

  showTimerFinishedUI(activeOrder) {
    const timerDisplay = document.getElementById('countdown-timer-display');
    const timerMessage = document.getElementById('timer-sub-message');
    const timerBox = document.getElementById('timer-container-box');

    if (timerDisplay) timerDisplay.textContent = '00:00';
    if (timerMessage) {
      timerMessage.innerHTML = `
        <span class="text-emerald-700 font-bold">
          🎉 5 Minute Pura Hua! Aapka khana Table ${activeOrder.tableNo} par serve ho raha hai.
        </span>
        <br><span class="text-[10px] text-stone-500">Kripya Table / Counter par ₹${activeOrder.totalAmount} Cash tayar rakhein.</span>
      `;
    }
    if (timerBox) {
      timerBox.classList.remove('border-orange-200');
      timerBox.classList.add('border-emerald-300', 'bg-emerald-50');
    }
  }

  // --- SETUP EVENT LISTENERS ---
  setupEventListeners() {
    const setupForm = document.getElementById('first-time-setup-form');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => this.completeSetup(e));
    }

    const searchInput = document.getElementById('food-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.setSearch(e.target.value));
    }

    const checkoutForm = document.getElementById('order-checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => this.placeOrder(e));
    }
  }
}

// Instantiate global app
window.app = new RestaurantApp();
