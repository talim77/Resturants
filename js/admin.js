/**
 * Admin Panel Logic - Admin.js
 * Handles: Simple PIN/ID login, Live Orders management, Menu CRUD, and Restaurant Settings.
 */

class AdminController {
  constructor() {
    this.activeTab = 'orders'; // 'orders', 'menu', 'settings'
    this.orderFilter = 'active'; // 'active', 'all', 'pending', 'preparing', 'ready', 'completed'
    this.searchOrderQuery = '';
    this.editingItemId = null;
    this.soundEnabled = true;
    this.lastOrderCount = 0;

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
  }

  // --- AUDIO ALERT VIA WEB AUDIO API ---
  playNotificationChime() {
    if (!this.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2); // D6
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    const btn = document.getElementById('toggle-sound-btn');
    if (btn) {
      btn.innerHTML = this.soundEnabled 
        ? `🔔 <span class="hidden sm:inline">Sound: ON</span>` 
        : `🔕 <span class="hidden sm:inline">Sound: OFF</span>`;
      btn.className = this.soundEnabled
        ? 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 transition'
        : 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 text-stone-500 border border-stone-200 transition';
    }
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
        errorMsg.textContent = 'Galat Admin ID ya PIN! Kripya sahi details dalein.';
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

    // Cloud connection status pill
    const cloudStatusEl = document.getElementById('cloud-sync-status-pill');
    if (cloudStatusEl) {
      if (store.isCloudConnected) {
        cloudStatusEl.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5';
        cloudStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Cloud Synced`;
      } else {
        cloudStatusEl.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-stone-100 text-stone-600 flex items-center gap-1.5';
        cloudStatusEl.innerHTML = `<span class="w-2 h-2 rounded-full bg-stone-400"></span> Local Storage (Offline)`;
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

  // --- TABS NAVIGATION ---
  switchTab(tabName) {
    this.activeTab = tabName;
    ['orders', 'menu', 'settings'].forEach(tab => {
      const view = document.getElementById(`tab-view-${tab}`);
      const btn = document.getElementById(`tab-btn-${tab}`);
      if (view) {
        if (tab === tabName) {
          view.classList.remove('hidden');
        } else {
          view.classList.add('hidden');
        }
      }
      if (btn) {
        if (tab === tabName) {
          btn.className = 'px-4 py-2 text-sm font-bold rounded-xl bg-orange-600 text-white shadow-sm transition';
        } else {
          btn.className = 'px-4 py-2 text-sm font-semibold rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition';
        }
      }
    });

    if (tabName === 'orders') this.renderOrders();
    if (tabName === 'menu') this.renderMenuTable();
    if (tabName === 'settings') this.populateSettingsForm();
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
        btn.className = 'order-filter-btn px-3 py-1.5 text-xs font-bold rounded-lg bg-stone-900 text-white transition';
      } else {
        btn.className = 'order-filter-btn px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition';
      }
    });
    this.renderOrders();
  }

  renderOrders() {
    const listContainer = document.getElementById('orders-feed-container');
    if (!listContainer) return;

    let orders = store.getOrders();

    // Apply Filter
    if (this.orderFilter === 'active') {
      orders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
    } else if (this.orderFilter !== 'all') {
      orders = orders.filter(o => o.status === this.orderFilter);
    }

    // Apply Search
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
        <div class="text-center py-12 px-4 bg-white rounded-2xl border border-stone-200">
          <p class="text-4xl mb-2">📋</p>
          <h4 class="text-base font-bold text-stone-800">Koi order nahi mila</h4>
          <p class="text-xs text-stone-500 mt-1">Naye orders yahan automatically real-time me appear honge.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = orders.map(order => {
      const timeAgo = this.formatTimeAgo(order.placedAt);
      const statusBadge = this.getStatusBadge(order.status);

      return `
        <div class="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:shadow-md transition">
          <!-- Top Row: Order ID, Table, Time, Status -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
            <div class="flex items-center gap-2">
              <span class="font-extrabold text-sm text-stone-900">${order.id}</span>
              <span class="px-2.5 py-1 bg-orange-100 text-orange-900 text-xs font-black rounded-lg border border-orange-200">
                TABLE ${order.tableNo}
              </span>
              <span class="text-xs text-stone-400 font-medium">${timeAgo}</span>
            </div>

            <div>
              ${statusBadge}
            </div>
          </div>

          <!-- Customer Info & Cash Badge -->
          <div class="flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2 mb-3 bg-stone-50 px-3 py-2 rounded-xl">
            <div class="flex items-center gap-3">
              <span>👤 <strong>${order.customerName || 'Walk-in Guest'}</strong></span>
              <span>📞 <a href="tel:${order.customerPhone}" class="text-orange-600 hover:underline font-mono font-bold">${order.customerPhone}</a></span>
            </div>
            <div>
              <span class="inline-flex items-center gap-1 font-bold text-stone-800 bg-amber-100/70 border border-amber-200 text-[11px] px-2 py-0.5 rounded">
                💵 Cash on Table / Counter
              </span>
            </div>
          </div>

          <!-- Items Ordered List -->
          <div class="space-y-1 mb-4">
            ${(order.items || []).map(item => `
              <div class="flex justify-between items-center text-xs text-stone-700 py-1 border-b border-stone-50 last:border-0">
                <div class="flex items-center gap-2">
                  <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'}"></span>
                  <span class="font-medium text-stone-800">${item.name}</span>
                  <span class="text-stone-400 font-bold">&times; ${item.quantity}</span>
                </div>
                <span class="font-mono font-bold text-stone-900">₹${item.price * item.quantity}</span>
              </div>
            `).join('')}
          </div>

          <!-- Total Bill & Action Buttons -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-100">
            <div>
              <span class="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">Total Bill</span>
              <p class="text-lg font-black text-stone-900 leading-none">₹${order.totalAmount}</p>
            </div>

            <!-- Workflow Status Buttons -->
            <div class="flex items-center gap-2 flex-wrap">
              ${order.status === 'pending' ? `
                <button 
                  onclick="admin.updateStatus('${order.id}', 'preparing')"
                  class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
                >
                  <span>🍳 Kitchen Start (Preparing)</span>
                </button>
              ` : ''}

              ${order.status === 'preparing' ? `
                <button 
                  onclick="admin.updateStatus('${order.id}', 'ready')"
                  class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
                >
                  <span>🍽️ Ready / Serve to Table</span>
                </button>
              ` : ''}

              ${order.status === 'ready' ? `
                <button 
                  onclick="admin.updateStatus('${order.id}', 'completed')"
                  class="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1.5"
                >
                  <span>✅ Cash Collected & Done</span>
                </button>
              ` : ''}

              ${order.status !== 'completed' && order.status !== 'cancelled' ? `
                <button 
                  onclick="admin.cancelOrderPrompt('${order.id}')"
                  class="px-2.5 py-1.5 text-stone-400 hover:text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition"
                  title="Cancel Order"
                >
                  Cancel
                </button>
              ` : ''}

              <button 
                onclick="admin.printReceipt('${order.id}')"
                class="px-2.5 py-1.5 text-stone-600 hover:text-stone-900 text-xs font-medium rounded-lg bg-stone-100 hover:bg-stone-200 transition"
                title="Print Receipt"
              >
                🖨️ Print
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
        return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> New / Pending
        </span>`;
      case 'preparing':
        return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
          🍳 In Kitchen
        </span>`;
      case 'ready':
        return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          🍽️ Ready / Served
        </span>`;
      case 'completed':
        return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-stone-100 text-stone-700">
          ✓ Completed
        </span>`;
      case 'cancelled':
        return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">
          ✕ Cancelled
        </span>`;
      default:
        return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-stone-100 text-stone-700">${status}</span>`;
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
            body { font-family: monospace; padding: 20px; font-size: 13px; color: #000; }
            .center { text-align: center; }
            .dashed { border-top: 1px dashed #000; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            .title { font-size: 18px; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title bold">${res.name}</div>
            <div>${res.tagline || ''}</div>
            <div class="dashed"></div>
            <div class="bold" style="font-size: 16px;">TABLE ${order.tableNo}</div>
            <div>Order: ${order.id} | ${order.placedAtTime || ''}</div>
            <div>Cust: ${order.customerName || 'Walk-in'} (${order.customerPhone})</div>
          </div>
          <div class="dashed"></div>
          <div>
            ${order.items.map(i => `
              <div class="flex" style="margin: 4px 0;">
                <span>${i.name} x ${i.quantity}</span>
                <span>₹${i.price * i.quantity}</span>
              </div>
            `).join('')}
          </div>
          <div class="dashed"></div>
          <div class="flex bold" style="font-size: 15px;">
            <span>TOTAL (CASH):</span>
            <span>₹${order.totalAmount}</span>
          </div>
          <div class="dashed"></div>
          <div class="center" style="font-size: 11px;">
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
        <div class="text-center py-12 px-4 bg-white rounded-2xl border border-stone-200">
          <p class="text-3xl mb-2">🍽️</p>
          <h4 class="text-base font-bold text-stone-800">Menu Khali Hai</h4>
          <p class="text-xs text-stone-500 mt-1 mb-4">Naya item add karein ya demo menu load karein.</p>
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
              <th class="px-4 py-3">Item Details</th>
              <th class="px-3 py-3">Category</th>
              <th class="px-3 py-3">Price</th>
              <th class="px-3 py-3">Stock Status</th>
              <th class="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            ${menu.map(item => `
              <tr class="hover:bg-stone-50/70 transition">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img 
                      src="${item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'}" 
                      alt="${item.name}" 
                      class="w-10 h-10 rounded-lg object-cover bg-stone-100 border border-stone-200"
                      onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80'"
                    />
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="${item.isVeg ? 'veg-badge' : 'non-veg-badge'}"></span>
                        <span class="font-bold text-stone-900 text-sm">${item.name}</span>
                      </div>
                      <p class="text-[11px] text-stone-400 line-clamp-1 max-w-xs">${item.description || ''}</p>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-3 font-medium">
                  <span class="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full text-[11px]">
                    ${item.category}
                  </span>
                </td>
                <td class="px-3 py-3 font-extrabold text-stone-900 text-sm">
                  ₹${item.price}
                </td>
                <td class="px-3 py-3">
                  <button 
                    onclick="admin.toggleAvailability('${item.id}')"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      item.isAvailable !== false 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }"
                  >
                    <span class="w-1.5 h-1.5 rounded-full ${item.isAvailable !== false ? 'bg-emerald-500' : 'bg-red-500'}"></span>
                    ${item.isAvailable !== false ? 'In Stock' : 'Out of Stock'}
                  </button>
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                  <button 
                    onclick="admin.editItem('${item.id}')"
                    class="px-2.5 py-1.5 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg font-semibold transition"
                  >
                    Edit
                  </button>
                  <button 
                    onclick="admin.deleteItemPrompt('${item.id}', '${item.name.replace(/'/g, "\\'")}')"
                    class="px-2.5 py-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg font-semibold transition"
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

  // --- SETTINGS TAB ---
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

    // Populate Firebase config if exists
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

    store.saveRestaurant({
      name,
      tagline,
      adminId,
      adminPin
    });

    alert('Settings successfully save ho gayi hain!');
    this.renderHeader();
  }

  saveFirebaseConfig() {
    const textarea = document.getElementById('settings-firebase-config');
    if (!textarea) return;
    const val = textarea.value.trim();

    if (!val) {
      localStorage.removeItem(STORAGE_KEYS.FIREBASE_CONFIG);
      alert('Cloud configuration remove kar di gayi hai (Offline LocalStorage active).');
      this.renderHeader();
      return;
    }

    try {
      // Parse JSON config
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
    // Admin login form
    const loginForm = document.getElementById('admin-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Item edit form
    const itemForm = document.getElementById('item-edit-form');
    if (itemForm) {
      itemForm.addEventListener('submit', (e) => this.saveItemForm(e));
    }

    // Settings form
    const settingsForm = document.getElementById('restaurant-settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => this.saveSettingsForm(e));
    }

    // Search order input
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
