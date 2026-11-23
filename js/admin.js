/**
 * Admin Panel Logic - Admin.js (Phone & Desktop Responsive + PWA)
 * Handles: PIN/ID login, Real-time Order feed with Sound & Vibration,
 * Menu CRUD, Cloud Credentials update, and PWA installation.
 */

class AdminController {
  constructor() {
    this.activeTab = 'orders'; // 'orders', 'menu', 'settings'
    this.orderFilter = 'active'; // 'active', 'all', 'pending', 'preparing', 'ready', 'completed'
    this.searchOrderQuery = '';
    this.editingItemId = null;
    this.soundEnabled = true;
    this.lastOrderCount = 0;
    this.deferredPrompt = null;
    this.audioCtx = null;

    this.init();
  }

  init() {
    this.checkAuth();

    // Listen to changes from store
    store.subscribe('orders', (orders) => this.onOrdersChanged(orders));
    store.subscribe('menu', () => {
      if (this.activeTab === 'menu') this.renderMenuTable();
      this.updateStats();
    });
    store.subscribe('restaurant', () => {
      this.renderHeader();
      this.populateSettingsForm();
    });

    this.setupEventListeners();
    this.setupPWAInstall();
  }

  // --- PWA INSTALLATION PROMPT ---
  setupPWAInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const banner = document.getElementById('pwa-install-banner');
      if (banner) {
        banner.classList.remove('hidden');
        banner.classList.add('flex');
      }
    });

    window.addEventListener('appinstalled', () => {
      const banner = document.getElementById('pwa-install-banner');
      if (banner) banner.classList.add('hidden');
      this.deferredPrompt = null;
      console.log('Resto Admin PWA Installed!');
    });
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        this.deferredPrompt = null;
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.classList.add('hidden');
      });
    } else {
      alert('Apne browser ke Menu (⋮) me jakar "Add to Home Screen" ya "Install App" par click karein.');
    }
  }

  // --- AUDIO ALERT VIA WEB AUDIO API + VIBRATION ---
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playNotificationChime() {
    // 1. Phone Vibration
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([300, 150, 300, 150, 400]);
      } catch (e) {
        console.warn('Vibrate not permitted:', e);
      }
    }

    // 2. Audio Chime
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const playTone = (freq, start, duration) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };

      // Melodic 3-tone chime (G5, B5, E6)
      playTone(783.99, 0, 0.25);
      playTone(987.77, 0.15, 0.25);
      playTone(1318.51, 0.3, 0.5);
    } catch (e) {
      console.warn('Audio chime notice:', e);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    const btn = document.getElementById('toggle-sound-btn');
    if (btn) {
      btn.innerHTML = this.soundEnabled 
        ? `<span>🔔</span> <span class="hidden sm:inline">Sound: ON</span>` 
        : `<span>🔕</span> <span class="hidden sm:inline">Sound: OFF</span>`;
      btn.className = this.soundEnabled
        ? 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 transition flex items-center gap-1'
        : 'px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-stone-100 text-stone-500 border border-stone-200 transition flex items-center gap-1';
    }
    // Unlock audio context on toggle click
    this.getAudioContext();
  }

  // --- AUTHENTICATION ---
  checkAuth() {
    const isAuth = store.isAdminAuthenticated();
    const loginCard = document.getElementById('admin-login-card');
    const dashboardView = document.getElementById('admin-dashboard');

    if (!isAuth) {
      if (loginCard) loginCard.classList.remove('hidden');
      if (dashboardView) dashboardView.classList.add('hidden');
    } else {
      if (loginCard) loginCard.classList.add('hidden');
      if (dashboardView) dashboardView.classList.remove('hidden');
      this.getAudioContext(); // Unlock audio context
      this.renderHeader();
      this.updateStats();
      this.renderOrders();
      this.populateSettingsForm();
    }
  }

  handleLogin(e) {
    e.preventDefault();
    const idInput = document.getElementById('admin-login-id');
    const pinInput = document.getElementById('admin-login-pin');
    const errorMsg = document.getElementById('login-error-msg');

    const adminId = idInput ? idInput.value.trim() : '';
    const pin = pinInput ? pinInput.value.trim() : '';

    if (!adminId || !pin) {
      if (errorMsg) {
        errorMsg.textContent = 'Admin ID aur PIN dono bharein.';
        errorMsg.classList.remove('hidden');
      }
      return;
    }

    const verified = store.verifyAdmin(adminId, pin);
    if (verified) {
      if (errorMsg) errorMsg.classList.add('hidden');
      if (idInput) idInput.value = '';
      if (pinInput) pinInput.value = '';
      this.checkAuth();
    } else {
      if (errorMsg) {
        errorMsg.textContent = 'Galat Admin ID ya PIN! Kripya sahi credentials dalein.';
        errorMsg.classList.remove('hidden');
      }
      pinInput.value = '';
      pinInput.focus();
    }
  }

  handleLogout() {
    if (confirm('Kya aap Admin Panel se Logout karna chahte hain?')) {
      store.adminLogout();
      this.checkAuth();
    }
  }

  // --- HEADER & METRICS ---
  renderHeader() {
    const res = store.getRestaurant();
    const nameEl = document.getElementById('admin-res-name');
    if (nameEl && res) {
      nameEl.textContent = res.name || 'Restaurant Admin';
    }

    const cloudStatusEl = document.getElementById('cloud-sync-status-pill');
    if (cloudStatusEl) {
      if (store.isCloudConnected) {
        cloudStatusEl.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1';
        cloudStatusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Cloud Live`;
      } else {
        cloudStatusEl.className = 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-100 text-stone-600 flex items-center gap-1';
        cloudStatusEl.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-stone-400"></span> Local Sync`;
      }
    }
  }

  updateStats() {
    const orders = store.getOrders();
    const menu = store.getMenu();

    const today = new Date().toDateString();
    const todaysOrders = orders.filter(o => new Date(o.placedAt).toDateString() === today);
    const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
    const totalCashSales = todaysOrders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const statOrders = document.getElementById('stat-total-orders');
    const statSales = document.getElementById('stat-cash-sales');
    const statActive = document.getElementById('stat-active-orders');
    const statMenuItems = document.getElementById('stat-menu-items');

    if (statOrders) statOrders.textContent = todaysOrders.length;
    if (statSales) statSales.textContent = `₹${totalCashSales}`;
    if (statActive) {
      statActive.textContent = activeOrders.length;
      if (activeOrders.length > 0) {
        statActive.classList.add('text-orange-600');
      } else {
        statActive.classList.remove('text-orange-600');
      }
    }
    if (statMenuItems) statMenuItems.textContent = menu.length;
  }

  // --- TABS NAVIGATION (Desktop + Mobile Phone Bottom Bar) ---
  switchTab(tabName) {
    this.activeTab = tabName;

    // Desktop Tabs
    ['orders', 'menu', 'settings'].forEach(tab => {
      const view = document.getElementById(`tab-view-${tab}`);
      const btn = document.getElementById(`tab-btn-${tab}`);
      const mobBtn = document.getElementById(`mob-btn-${tab}`);

      if (view) {
        if (tab === tabName) {
          view.classList.remove('hidden');
        } else {
          view.classList.add('hidden');
        }
      }
      if (btn) {
        if (tab === tabName) {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-xl bg-orange-600 text-white shadow-sm transition';
        } else {
          btn.className = 'px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition';
        }
      }
      // Mobile Bottom Bar
      if (mobBtn) {
        if (tab === tabName) {
          mobBtn.className = 'flex flex-col items-center justify-center flex-1 h-full text-orange-600 font-bold transition';
        } else {
          mobBtn.className = 'flex flex-col items-center justify-center flex-1 h-full text-stone-500 font-medium transition';
        }
      }
    });

    if (tabName === 'orders') this.renderOrders();
    if (tabName === 'menu') this.renderMenuTable();
    if (tabName === 'settings') this.populateSettingsForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- ORDERS TAB LOGIC ---
  onOrdersChanged(orders) {
    if (orders.length > this.lastOrderCount) {
      this.playNotificationChime();
    }
    this.lastOrderCount = orders.length;
    this.updateStats();
    if (this.activeTab === 'orders') {
      this.renderOrders();
    }
  }

  setOrderFilter(filter) {
    this.orderFilter = filter;
    document.querySelectorAll('.order-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-filter');
      if (f === filter) {
        btn.className = 'order-filter-btn px-3 py-1.5 text-xs font-bold rounded-lg bg-stone-900 text-white transition whitespace-nowrap';
      } else {
        btn.className = 'order-filter-btn px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition whitespace-nowrap';
      }
    });
    this.renderOrders();
  }

  renderOrders() {
    const listContainer = document.getElementById('orders-feed-container');
    if (!listContainer) return;

    let orders = store.getOrders();

    if (this.orderFilter === 'active') {
      orders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
    } else if (this.orderFilter !== 'all') {
      orders = orders.filter(o => o.status === this.orderFilter);
    }

    if (this.searchOrderQuery.trim()) {
      const q = this.searchOrderQuery.toLowerCase();
      orders = orders.filter(o => 
        o.id.toLowerCase().includes(q) || 
        o.tableNo.toLowerCase().includes(q) || 
        (o.customerPhone || '').includes(q) || 
        (o.customerName || '').toLowerCase().includes(q)
      );
    }

    if (orders.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-10 px-4 bg-white rounded-2xl border border-stone-200">
          <p class="text-3xl mb-1">📋</p>
          <h4 class="text-sm font-bold text-stone-800">Koi order nahi mila</h4>
          <p class="text-[11px] text-stone-400 mt-0.5">Naye orders yahan real-time sound ke sath show honge.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = orders.map(order => {
      const timeAgo = this.formatTimeAgo(order.placedAt);
      const statusBadge = this.getStatusBadge(order.status);

      return `
        <div class="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-4 shadow-sm hover:shadow-md transition">
          <!-- Top Row: Order ID, Table, Time, Status -->
          <div class="flex flex-wrap items-center justify-between gap-1.5 border-b border-stone-100 pb-2.5 mb-2.5">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="font-extrabold text-xs sm:text-sm text-stone-900">${order.id}</span>
              <span class="px-2 py-0.5 bg-orange-100 text-orange-900 text-[11px] font-black rounded-lg border border-orange-200">
                TABLE ${order.tableNo}
              </span>
              <span class="text-[10px] text-stone-400 font-medium">${timeAgo}</span>
            </div>

            <div>
              ${statusBadge}
            </div>
          </div>

          <!-- Customer Info & Cash Badge -->
          <div class="flex flex-wrap items-center justify-between text-[11px] text-stone-600 gap-1.5 mb-2.5 bg-stone-50 px-2.5 py-1.5 rounded-xl">
            <div class="flex items-center gap-2">
              <span>👤 <strong>${order.customerName || 'Walk-in'}</strong></span>
              <span>📞 <a href="tel:${order.customerPhone}" class="text-orange-600 hover:underline font-mono font-bold">${order.customerPhone}</a></span>
            </div>
            <div>
              <span class="inline-flex items-center gap-1 font-bold text-stone-800 bg-amber-100/70 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded">
                💵 Cash on Table
              </span>
            </div>
          </div>

          <!-- Items Ordered List -->
          <div class="space-y-1 mb-3">
            ${(order.items || []).map(item => `
              <div class="flex justify-between items-center text-xs text-stone-700 py-0.5 border-b border-stone-50 last:border-0">
                <div class="flex items-center gap-1.5 truncate pr-2">
                  <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'} flex-shrink-0"></span>
                  <span class="font-medium text-stone-800 truncate">${item.name}</span>
                  <span class="text-stone-400 font-bold flex-shrink-0">&times; ${item.quantity}</span>
                </div>
                <span class="font-mono font-bold text-stone-900 flex-shrink-0">₹${item.price * item.quantity}</span>
              </div>
            `).join('')}
          </div>

          <!-- Total Bill & Action Buttons (Touch Friendly) -->
          <div class="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-stone-100">
            <div>
              <span class="text-[9px] text-stone-400 uppercase tracking-wider font-semibold">Total Bill</span>
              <p class="text-base font-black text-stone-900 leading-none">₹${order.totalAmount}</p>
            </div>

            <!-- Workflow Status Action Buttons -->
            <div class="flex items-center gap-1.5 flex-wrap">
              ${order.status === 'pending' ? `
                <button 
                  onclick="admin.updateStatus('${order.id}', 'preparing')"
                  class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <span>🍳 Cook (In Kitchen)</span>
                </button>
              ` : ''}

              ${order.status === 'preparing' ? `
                <button 
                  onclick="admin.updateStatus('${order.id}', 'ready')"
                  class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <span>🍽️ Serve to Table</span>
                </button>
              ` : ''}

              ${order.status === 'ready' ? `
                <button 
                  onclick="admin.updateStatus('${order.id}', 'completed')"
                  class="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1"
                >
                  <span>✅ Cash Collected</span>
                </button>
              ` : ''}

              ${order.status !== 'completed' && order.status !== 'cancelled' ? `
                <button 
                  onclick="admin.cancelOrderPrompt('${order.id}')"
                  class="px-2 py-1.5 text-stone-400 hover:text-red-600 text-[11px] font-medium rounded-lg hover:bg-red-50 transition"
                  title="Cancel Order"
                >
                  Cancel
                </button>
              ` : ''}

              <button 
                onclick="admin.printReceipt('${order.id}')"
                class="px-2 py-1.5 text-stone-600 hover:text-stone-900 text-[11px] font-medium rounded-lg bg-stone-100 hover:bg-stone-200 transition"
                title="Print Receipt"
              >
                🖨️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  getStatusBadge(status) {
    switch (status) {
      case 'pending':
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> New
        </span>`;
      case 'preparing':
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
          🍳 Cooking
        </span>`;
      case 'ready':
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          🍽️ Ready / Served
        </span>`;
      case 'completed':
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-100 text-stone-700">
          ✓ Completed
        </span>`;
      case 'cancelled':
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700">
          ✕ Cancelled
        </span>`;
      default:
        return `<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-stone-100 text-stone-700">${status}</span>`;
    }
  }

  formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  }

  updateStatus(orderId, status) {
    store.updateOrderStatus(orderId, status);
  }

  cancelOrderPrompt(orderId) {
    if (confirm(`Kya aap order ${orderId} ko cancel karna chahte hain?`)) {
      this.updateStatus(orderId, 'cancelled');
    }
  }

  printReceipt(orderId) {
    const order = store.getOrders().find(o => o.id === orderId);
    if (!order) return;
    const res = store.getRestaurant() || { name: 'Restaurant' };

    const printWin = window.open('', '_blank', 'width=380,height=600');
    if (!printWin) {
      alert('Pop-up blocker disable karein receipt print karne ke liye.');
      return;
    }

    printWin.document.write(`
      <html>
        <head>
          <title>Receipt - ${order.id}</title>
          <style>
            body { font-family: monospace; padding: 15px; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .title { font-size: 16px; margin-bottom: 2px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title bold">${res.name}</div>
            <div>${res.tagline || ''}</div>
            <div class="dashed"></div>
            <div class="bold" style="font-size: 15px;">TABLE ${order.tableNo}</div>
            <div>Order: ${order.id} | ${order.placedAtTime || ''}</div>
            <div>Cust: ${order.customerName || 'Walk-in'} (${order.customerPhone})</div>
          </div>
          <div class="dashed"></div>
          <div>
            ${order.items.map(i => `
              <div class="flex" style="margin: 3px 0;">
                <span>${i.name} x ${i.quantity}</span>
                <span>₹${i.price * i.quantity}</span>
              </div>
            `).join('')}
          </div>
          <div class="dashed"></div>
          <div class="flex bold" style="font-size: 14px;">
            <span>TOTAL (CASH):</span>
            <span>₹${order.totalAmount}</span>
          </div>
          <div class="dashed"></div>
          <div class="center" style="font-size: 10px;">
            Payment: CASH ON TABLE<br>
            Dhanyawad! Please Visit Again!
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 300);
  }

  // --- MENU MANAGEMENT TAB ---
  renderMenuTable() {
    const container = document.getElementById('admin-menu-list');
    if (!container) return;

    const menu = store.getMenu();

    if (menu.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 px-4 bg-white rounded-2xl border border-stone-200">
          <p class="text-3xl mb-1">🍽️</p>
          <h4 class="text-sm font-bold text-stone-800">Menu Khali Hai</h4>
          <p class="text-xs text-stone-500 mt-0.5 mb-3">Naya item add karein.</p>
          <button onclick="admin.openItemModal()" class="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow">
            + Naya Item Add Karein
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-700">
          <thead class="bg-stone-50 text-stone-400 uppercase text-[10px] tracking-wider border-b border-stone-200">
            <tr>
              <th class="px-3.5 py-2.5">Item</th>
              <th class="px-2.5 py-2.5">Cat</th>
              <th class="px-2.5 py-2.5">Price</th>
              <th class="px-2.5 py-2.5">Stock</th>
              <th class="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            ${menu.map(item => `
              <tr class="hover:bg-stone-50/70 transition">
                <td class="px-3.5 py-2.5">
                  <div class="flex items-center gap-2.5">
                    <img 
                      src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'}" 
                      alt="${item.name}" 
                      class="w-9 h-9 rounded-lg object-cover bg-stone-100 border border-stone-200 flex-shrink-0"
                      onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'"
                    />
                    <div class="min-w-0">
                      <div class="flex items-center gap-1">
                        <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'} flex-shrink-0"></span>
                        <span class="font-bold text-stone-900 text-xs truncate">${item.name}</span>
                      </div>
                      <p class="text-[10px] text-stone-400 line-clamp-1 max-w-[140px] sm:max-w-xs">${item.description || ''}</p>
                    </div>
                  </div>
                </td>
                <td class="px-2.5 py-2.5 font-medium">
                  <span class="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full text-[10px]">
                    ${item.category}
                  </span>
                </td>
                <td class="px-2.5 py-2.5 font-extrabold text-stone-900 text-xs">
                  ₹${item.price}
                </td>
                <td class="px-2.5 py-2.5">
                  <button 
                    onclick="admin.toggleAvailability('${item.id}')"
                    class="px-2 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                      item.isAvailable !== false 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }"
                  >
                    <span class="w-1.5 h-1.5 rounded-full ${item.isAvailable !== false ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                    ${item.isAvailable !== false ? 'In Stock' : 'Out'}
                  </button>
                </td>
                <td class="px-3.5 py-2.5 text-right space-x-1.5">
                  <button 
                    onclick="admin.editItem('${item.id}')"
                    class="px-2 py-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded font-semibold text-[11px]"
                  >
                    Edit
                  </button>
                  <button 
                    onclick="admin.deleteItemPrompt('${item.id}', '${item.name.replace(/'/g, "\\'")}')"
                    class="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-semibold text-[11px]"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  toggleAvailability(id) {
    store.toggleItemAvailability(id);
    this.renderMenuTable();
  }

  openItemModal(itemId = null) {
    this.editingItemId = itemId;
    const modal = document.getElementById('item-edit-modal');
    const titleEl = document.getElementById('modal-item-title');
    const form = document.getElementById('item-edit-form');
    if (!modal || !form) return;

    if (itemId) {
      const item = store.getMenu().find(i => i.id === itemId);
      if (!item) return;
      if (titleEl) titleEl.textContent = 'Edit Food Item';
      document.getElementById('item-form-name').value = item.name;
      document.getElementById('item-form-category').value = item.category;
      document.getElementById('item-form-price').value = item.price;
      document.getElementById('item-form-isveg').value = item.isVeg ? 'true' : 'false';
      document.getElementById('item-form-desc').value = item.description || '';
      document.getElementById('item-form-image').value = item.image || '';
    } else {
      if (titleEl) titleEl.textContent = 'Naya Food Item Add Karein';
      form.reset();
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeItemModal() {
    const modal = document.getElementById('item-edit-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.editingItemId = null;
  }

  saveItemForm(e) {
    e.preventDefault();
    const name = document.getElementById('item-form-name').value.trim();
    const category = document.getElementById('item-form-category').value.trim() || 'General';
    const price = parseFloat(document.getElementById('item-form-price').value) || 0;
    const isVeg = document.getElementById('item-form-isveg').value === 'true';
    const description = document.getElementById('item-form-desc').value.trim();
    let image = document.getElementById('item-form-image').value.trim();

    if (!name) {
      alert('Kripya item ka naam bharein!');
      return;
    }

    if (!image) {
      image = isVeg 
        ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80';
    }

    if (this.editingItemId) {
      store.updateMenuItem(this.editingItemId, {
        name,
        category,
        price,
        isVeg,
        description,
        image
      });
    } else {
      store.addMenuItem({
        name,
        category,
        price,
        isVeg,
        description,
        image,
        isAvailable: true
      });
    }

    this.closeItemModal();
    this.renderMenuTable();
    this.updateStats();
  }

  editItem(id) {
    this.openItemModal(id);
  }

  deleteItemPrompt(id, name) {
    if (confirm(`Kya aap "${name}" ko menu se delete karna chahte hain?`)) {
      store.deleteMenuItem(id);
      this.renderMenuTable();
      this.updateStats();
    }
  }

  // --- SETTINGS TAB: CREDENTIALS & CLOUD ---
  populateSettingsForm() {
    const res = store.getRestaurant();
    if (!res) return;

    const nameInput = document.getElementById('settings-res-name');
    const taglineInput = document.getElementById('settings-res-tagline');
    const adminIdInput = document.getElementById('settings-admin-id');
    const adminPinInput = document.getElementById('settings-admin-pin');

    if (nameInput) nameInput.value = res.name || '';
    if (taglineInput) taglineInput.value = res.tagline || '';
    if (adminIdInput) adminIdInput.value = res.adminId || '';
    if (adminPinInput) adminPinInput.value = res.adminPin || '';

    const fbConfig = store.getFirebaseConfig();
    const fbTextarea = document.getElementById('settings-firebase-config');
    if (fbTextarea && fbConfig) {
      fbTextarea.value = JSON.stringify(fbConfig, null, 2);
    }
  }

  saveSettingsForm(e) {
    e.preventDefault();
    const name = document.getElementById('settings-res-name').value.trim();
    const tagline = document.getElementById('settings-res-tagline').value.trim();
    const adminId = document.getElementById('settings-admin-id').value.trim();
    const adminPin = document.getElementById('settings-admin-pin').value.trim();

    if (!name || !adminId || !adminPin) {
      alert('Restaurant Name, Admin ID aur PIN zaroori hain!');
      return;
    }

    // Saves locally and syncs directly to Cloud Firestore (stockora-77)
    store.saveRestaurant({
      name,
      tagline,
      adminId,
      adminPin
    });

    alert('Admin User ID & PIN successfully updated to Cloud! Ab aap kisi bhi device se in credentials se login kar sakte hain.');
    this.renderHeader();
  }

  saveFirebaseConfig() {
    const textarea = document.getElementById('settings-firebase-config');
    if (!textarea) return;
    const val = textarea.value.trim();

    try {
      const config = JSON.parse(val);
      if (!config.apiKey || !config.projectId) {
        alert('Invalid Firebase Config! Isme apiKey aur projectId hona zaroori hai.');
        return;
      }
      store.saveFirebaseConfig(config);
      alert('Firebase Cloud Database configuration save ho gayi hai!');
      this.renderHeader();
    } catch (e) {
      alert('JSON format galat hai! Kripya valid JSON object paste karein.');
    }
  }

  exportDataBackup() {
    const backupJson = store.exportBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `restaurant-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importDataPrompt() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const ok = store.importBackup(event.target.result);
        if (ok) {
          alert('Data backup successfully restore ho gaya!');
          location.reload();
        } else {
          alert('Data restore karne me error aayi!');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  loadSampleMenuConfirm() {
    if (confirm('Kya aap sample demo items reload karna chahte hain?')) {
      store.loadDefaultMenu();
      this.renderMenuTable();
      this.updateStats();
      alert('Sample menu items load ho gaye hain!');
    }
  }

  // --- SETUP EVENT LISTENERS ---
  setupEventListeners() {
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    const itemForm = document.getElementById('item-edit-form');
    if (itemForm) {
      itemForm.addEventListener('submit', (e) => this.saveItemForm(e));
    }

    const settingsForm = document.getElementById('restaurant-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.saveSettingsForm(e));
    }

    const searchOrderInput = document.getElementById('search-orders-input');
    if (searchOrderInput) {
      searchOrderInput.addEventListener('input', (e) => {
        this.searchOrderQuery = e.target.value;
        this.renderOrders();
      });
    }
  }
}

// Instantiate global admin controller
window.admin = new AdminController();
