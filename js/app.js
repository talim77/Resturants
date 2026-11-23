/**
 * Customer Frontend Logic - App.js
 * Handles: First-time setup, Welcome page, Menu browsing, Search/Filter, Cart, Checkout, and 5-min Timer.
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
  }

  // --- RENDER WELCOME & BRANDING ---
  renderHeaderAndWelcome() {
    const restaurant = store.getRestaurant();
    const resName = restaurant && restaurant.name ? restaurant.name : 'Apna Restaurant';
    const resTagline = restaurant && restaurant.tagline ? restaurant.tagline : 'Taste that feels like home';

    // Update Brand Titles
    document.querySelectorAll('.brand-name').forEach(el => el.textContent = resName);
    document.querySelectorAll('.brand-tagline').forEach(el => el.textContent = resTagline);
    document.title = `${resName} - Food Menu & Ordering`;
  }

  // --- MENU RENDERING ---
  renderMenu() {
    const menuContainer = document.getElementById('menu-items-grid');
    const categoryTabsContainer = document.getElementById('category-tabs');
    if (!menuContainer) return;

    const allItems = store.getMenu();

    // If menu is empty
    if (allItems.length === 0) {
      menuContainer.innerHTML = `
        <div class="col-span-full text-center py-16 px-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <div class="w-16 h-16 mx-auto mb-4 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center text-3xl">
            🍽️
          </div>
          <h3 class="text-xl font-bold text-stone-800 mb-1">Menu Abhi Khali Hai</h3>
          <p class="text-stone-500 text-sm max-w-sm mx-auto mb-6">
            Admin panel me jakar naye food items add karein ya starter menu load karein.
          </p>
          <a href="admin.html" class="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl shadow-md transition">
            Admin Panel me Items Add Karein &rarr;
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
            class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
              isActive 
                ? 'bg-orange-600 text-white shadow-md shadow-orange-500/20' 
                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
            }"
          >
            ${cat === 'ALL' ? 'Sabhi Items (All)' : cat}
          </button>
        `;
      }).join('');
    }

    // Filter Items by category, veg/non-veg, and search query
    let filteredItems = allItems.filter(item => {
      // Category filter
      if (this.activeCategory !== 'ALL' && item.category !== this.activeCategory) {
        return false;
      }
      // Veg/Non-Veg filter
      if (this.vegFilter === 'VEG' && !item.isVeg) return false;
      if (this.vegFilter === 'NON_VEG' && item.isVeg) return false;

      // Search query
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
        <div class="col-span-full text-center py-12 px-4 bg-white rounded-2xl border border-stone-200">
          <p class="text-3xl mb-2">🔍</p>
          <h4 class="text-lg font-bold text-stone-800">Koi item nahi mila</h4>
          <p class="text-stone-500 text-sm mt-1">Search keyword ya filter badal kar try karein.</p>
        </div>
      `;
      return;
    }

    // Render Menu Cards
    menuContainer.innerHTML = filteredItems.map(item => {
      const cartItem = this.cart.find(c => c.id === item.id);
      const qtyInCart = cartItem ? cartItem.quantity : 0;
      const isAvailable = item.isAvailable !== false;

      return `
        <div class="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden flex flex-col transition hover:shadow-md ${!isAvailable ? 'opacity-60 grayscale-[40%]' : ''}">
          <!-- Food Image with Badges -->
          <div class="relative h-44 sm:h-48 w-full bg-stone-100 overflow-hidden">
            <img 
              src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'}" 
              alt="${item.name}" 
              loading="lazy"
              class="w-full h-full object-cover transition duration-300 hover:scale-105"
              onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'"
            />
            
            <!-- Veg / Non-Veg Tag -->
            <div class="absolute top-3 left-3 shadow-md rounded bg-white px-2 py-1 flex items-center gap-1.5 text-xs font-semibold">
              <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'}"></span>
              <span class="${item.isVeg ? 'text-emerald-700' : 'text-red-700'}">${item.isVeg ? 'Veg' : 'Non-Veg'}</span>
            </div>

            <!-- Out of Stock Badge -->
            ${!isAvailable ? `
              <div class="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                <span class="bg-red-600 text-white font-bold text-xs uppercase px-3 py-1.5 rounded-full shadow-lg tracking-wider">
                  Sold Out / Not Available
                </span>
              </div>
            ` : ''}

            <!-- Category Pill -->
            <div class="absolute bottom-2.5 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
              ${item.category}
            </div>
          </div>

          <!-- Content -->
          <div class="p-4 flex-1 flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-1">
                <h4 class="text-base font-bold text-stone-900 leading-snug">${item.name}</h4>
              </div>
              <p class="text-xs text-stone-500 line-clamp-2 mb-3 leading-relaxed">
                ${item.description || 'Delicious freshly prepared dish crafted with authentic spices.'}
              </p>
            </div>

            <!-- Price & Add Button -->
            <div class="pt-3 border-t border-stone-100 flex items-center justify-between mt-auto">
              <div>
                <span class="text-xs text-stone-400 font-medium">Price</span>
                <p class="text-lg font-extrabold text-stone-900">₹${item.price}</p>
              </div>

              <div>
                ${!isAvailable ? `
                  <button disabled class="px-3.5 py-1.5 bg-stone-100 text-stone-400 text-xs font-semibold rounded-xl cursor-not-allowed">
                    Unavailable
                  </button>
                ` : qtyInCart > 0 ? `
                  <div class="inline-flex items-center bg-orange-50 border border-orange-200 rounded-xl overflow-hidden shadow-sm">
                    <button 
                      onclick="app.updateCartQty('${item.id}', -1)" 
                      class="w-8 h-8 flex items-center justify-center text-orange-700 font-bold hover:bg-orange-100 active:scale-95 transition"
                    >
                      &minus;
                    </button>
                    <span class="w-8 text-center font-bold text-sm text-orange-950">${qtyInCart}</span>
                    <button 
                      onclick="app.updateCartQty('${item.id}', 1)" 
                      class="w-8 h-8 flex items-center justify-center text-orange-700 font-bold hover:bg-orange-100 active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>
                ` : `
                  <button 
                    onclick="app.addToCart('${item.id}')"
                    class="px-4 py-2 bg-stone-900 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95 flex items-center gap-1.5"
                  >
                    <span>ADD</span>
                    <span class="text-orange-400 font-normal">+</span>
                  </button>
                `}
              </div>
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
    this.renderMenu(); // Re-render menu to update (+) and (-) buttons
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

    // Update Badges & Totals
    cartCountBadges.forEach(el => el.textContent = totalCount);
    cartTotalDisplays.forEach(el => el.textContent = `₹${totalPrice}`);

    // Floating bar visibility on mobile / desktop
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
          <div class="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200/70">
            <div class="flex items-center gap-3">
              <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'} flex-shrink-0"></span>
              <div>
                <h5 class="text-sm font-bold text-stone-900 leading-tight">${item.name}</h5>
                <p class="text-xs text-stone-500">₹${item.price} each</p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <!-- Qty Stepper -->
              <div class="inline-flex items-center bg-white border border-stone-200 rounded-lg shadow-2xs">
                <button 
                  onclick="app.updateCartQty('${item.id}', -1)"
                  class="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-orange-600 hover:bg-stone-50 font-bold"
                >
                  &minus;
                </button>
                <span class="w-6 text-center font-bold text-xs text-stone-800">${item.quantity}</span>
                <button 
                  onclick="app.updateCartQty('${item.id}', 1)"
                  class="w-7 h-7 flex items-center justify-center text-stone-600 hover:text-orange-600 hover:bg-stone-50 font-bold"
                >
                  +
                </button>
              </div>

              <!-- Line item total -->
              <div class="w-16 text-right">
                <span class="font-extrabold text-sm text-stone-900">₹${item.price * item.quantity}</span>
              </div>

              <!-- Delete -->
              <button 
                onclick="app.removeFromCart('${item.id}')" 
                class="text-stone-400 hover:text-red-500 transition p-1"
                title="Remove item"
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
      setTimeout(() => floatingBar.classList.remove('pulse-border'), 1500);
    }
  }

  // --- CART DRAWER TOGGLES ---
  openCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      backdrop.classList.remove('hidden');
      drawer.classList.remove('translate-x-full');
      this.updateCartUI();
    }
  }

  closeCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    const backdrop = document.getElementById('cart-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('translate-x-full');
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

    // Validation according to user specification:
    // Table No & Phone Number are REQUIRED. Name is OPTIONAL.
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

    // Create Order in Store
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
        // Still running
        if (window.location.hash === '#order-confirmed') {
          this.startOrderTimer(activeOrder);
        }
      } else {
        // Timer completed
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

    // Update Order Summary UI on Confirmation Screen
    const orderIdDisplay = document.getElementById('confirmed-order-id');
    const orderTableDisplay = document.getElementById('confirmed-table-no');
    const orderAmountDisplay = document.getElementById('confirmed-total-amount');
    const orderItemsList = document.getElementById('confirmed-items-list');

    if (orderIdDisplay) orderIdDisplay.textContent = activeOrder.orderId;
    if (orderTableDisplay) orderTableDisplay.textContent = `Table ${activeOrder.tableNo}`;
    if (orderAmountDisplay) orderAmountDisplay.textContent = `₹${activeOrder.totalAmount}`;

    if (orderItemsList) {
      orderItemsList.innerHTML = activeOrder.items.map(i => `
        <li class="flex justify-between text-xs py-1 text-stone-600 border-b border-stone-100 last:border-0">
          <span>${i.name} &times; ${i.quantity}</span>
          <span class="font-semibold text-stone-900">₹${i.price * i.quantity}</span>
        </li>
      `).join('');
    }

    const timerDisplay = document.getElementById('countdown-timer-display');
    const timerProgressBar = document.getElementById('timer-progress-bar');
    const timerMessage = document.getElementById('timer-sub-message');

    const updateTick = () => {
      const elapsedSeconds = Math.floor((Date.now() - activeOrder.placedAt) / 1000);
      const remainingSeconds = Math.max(0, activeOrder.durationSeconds - elapsedSeconds);

      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

      if (timerDisplay) {
        timerDisplay.textContent = formattedTime;
      }

      // Progress percentage
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
        <br><span class="text-xs text-stone-500">Kripya Table / Counter par ₹${activeOrder.totalAmount} Cash tayar rakhein.</span>
      `;
    }
    if (timerBox) {
      timerBox.classList.remove('border-orange-200');
      timerBox.classList.add('border-emerald-300', 'bg-emerald-50');
    }
  }

  // --- SETUP EVENT LISTENERS ---
  setupEventListeners() {
    // First time setup form
    const setupForm = document.getElementById('first-time-setup-form');
    if (setupForm) {
      setupForm.addEventListener('submit', (e) => this.completeSetup(e));
    }

    // Search input
    const searchInput = document.getElementById('food-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.setSearch(e.target.value));
    }

    // Checkout form
    const checkoutForm = document.getElementById('order-checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => this.placeOrder(e));
    }
  }
}

// Instantiate global app
window.app = new RestaurantApp();
