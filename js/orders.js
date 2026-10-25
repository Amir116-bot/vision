/**
 * VISION collection — Retro Digi Watches
 * Orders Management Dashboard Logic
 * Fetch, Display, and Update Customer Orders
 */

// Global Admin Passcode Fallback
const ADMIN_PASSCODE = window.ADMIN_PASSCODE || 'vis2000is';

// State
let allOrders = [];
let currentFilter = 'all';

function checkAdminAuth() {
  const storedAuth = sessionStorage.getItem('vision_admin_auth') || localStorage.getItem('vision_admin_auth');
  const isAuth = storedAuth === ADMIN_PASSCODE;
  const lockEl = document.getElementById('admin-auth-lock');
  if (lockEl) {
    if (isAuth) {
      lockEl.style.display = 'none';
    } else {
      lockEl.style.display = 'flex';
      const input = document.getElementById('admin-passcode');
      if (input) setTimeout(() => input.focus(), 150);
    }
  }
  return isAuth;
}

function handleAdminLogin(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('admin-passcode');
  const errorMsg = document.getElementById('auth-error-msg');
  const entered = input ? input.value.trim() : '';

  if (entered === ADMIN_PASSCODE) {
    sessionStorage.setItem('vision_admin_auth', ADMIN_PASSCODE);
    localStorage.setItem('vision_admin_auth', ADMIN_PASSCODE);
    const lockEl = document.getElementById('admin-auth-lock');
    if (lockEl) {
      lockEl.style.opacity = '0';
      setTimeout(() => { lockEl.style.display = 'none'; }, 250);
    }
    if (errorMsg) errorMsg.textContent = '';
  } else {
    if (errorMsg) {
      errorMsg.textContent = '❌ كود الدخول غير صحيح، يرجى إعادة المحاولة';
    }
    const box = document.querySelector('.admin-auth-box');
    if (box) {
      box.classList.add('shake');
      setTimeout(() => box.classList.remove('shake'), 500);
    }
    if (input) {
      input.focus();
      input.select();
    }
  }
}

function togglePasscodeVisibility() {
  const input = document.getElementById('admin-passcode');
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
}

function adminLogout() {
  sessionStorage.removeItem('vision_admin_auth');
  localStorage.removeItem('vision_admin_auth');
  window.location.reload();
}

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
  initOrders();
});

async function initOrders() {
  checkAdminAuth();
  await loadOrders();
}

/**
 * Load Orders from Supabase
 */
async function loadOrders() {
  const ordersListEl = document.getElementById('orders-list');
  const countBadgeEl = document.getElementById('total-orders-count');
  const statusPillEl = document.getElementById('orders-count-pill');

  if (!ordersListEl) return;
  ordersListEl.innerHTML = '<div class="empty-state"><span>⏳</span>جاري تحميل الطلبات...</div>';

  try {
    const client = window.SUPABASE_CONFIG?.getClient ? window.SUPABASE_CONFIG.getClient() : null;
    if (!client) {
      throw new Error('لم يتم تهيئة اتصال Supabase بنجاح');
    }

    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allOrders = data || [];

    if (statusPillEl) {
      statusPillEl.textContent = `إجمالي الطلبات: ${allOrders.length}`;
    }

    if (countBadgeEl) {
      countBadgeEl.textContent = `${allOrders.length} طلب`;
    }

    // Preserve Current Active Filter
    filterOrders(currentFilter);

  } catch (err) {
    console.error('Error fetching orders:', err);
    ordersListEl.innerHTML = `
      <div class="empty-state">
        <span>⚠️</span>
        <p>حدث خطأ أثناء الاتصال بقاعدة البيانات.</p>
        <small style="color:var(--text-muted);">${escapeHtml(err.message)}</small>
        <br><br>
        <button class="btn-secondary" onclick="loadOrders()">إعادة المحاولة</button>
      </div>
    `;
  }
}

/**
 * Render Orders List with Safe Event Binding
 */
function renderOrdersList(orders) {
  const ordersListEl = document.getElementById('orders-list');
  if (!ordersListEl) return;

  if (orders.length === 0) {
    ordersListEl.innerHTML = `
      <div class="empty-state">
        <span>📦</span>
        <p>لا توجد طلبات لتطابق هذا العرض.</p>
        <small>ستظهر الطلبات هنا فور تقديمها من الواجهة الرئيسية.</small>
      </div>
    `;
    return;
  }

  ordersListEl.innerHTML = '';

  orders.forEach(order => {
    const card = document.createElement('div');
    card.className = 'order-card';

    const statusClass = `status-${order.status || 'pending'}`;
    const statusText = getStatusText(order.status);

    card.innerHTML = `
      <div class="order-header">
        <div>
          <h3>${escapeHtml(order.post_title || 'منتج غير محدد')}</h3>
          <small style="color:var(--text-muted);">${formatDate(order.created_at)}</small>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>

      <div class="order-info-grid">
        <div class="order-info-item">
          <span class="order-info-label">اسم الزبون</span>
          <span class="order-info-value">${escapeHtml(order.customer_name)}</span>
        </div>
        <div class="order-info-item">
          <span class="order-info-label">رقم الهاتف</span>
          <span class="order-info-value" dir="ltr">${escapeHtml(order.customer_phone)}</span>
        </div>
        <div class="order-info-item">
          <span class="order-info-label">اللون المختار</span>
          <span class="order-info-value">${escapeHtml(order.selected_color || 'الافتراضي')}</span>
        </div>
        <div class="order-info-item">
          <span class="order-info-label">السعر</span>
          <span class="order-info-value">${order.post_price ? order.post_price + '$' : 'غير محدد'}</span>
        </div>
        <div class="order-info-item">
          <span class="order-info-label">العنوان</span>
          <span class="order-info-value">${escapeHtml(order.customer_address)}</span>
        </div>
        <div class="order-info-item">
          <span class="order-info-label">المدينة</span>
          <span class="order-info-value">${escapeHtml(order.customer_city || '-')}</span>
        </div>
        ${order.customer_email ? `
        <div class="order-info-item">
          <span class="order-info-label">البريد الإلكتروني</span>
          <span class="order-info-value" dir="ltr">${escapeHtml(order.customer_email)}</span>
        </div>
        ` : ''}
        ${order.order_notes ? `
        <div class="order-info-item" style="grid-column: 1 / -1;">
          <span class="order-info-label">ملاحظات الزبون</span>
          <span class="order-info-value">${escapeHtml(order.order_notes)}</span>
        </div>
        ` : ''}
      </div>

      <div class="order-actions">
        <select class="status-select">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>قيد الانتظار</option>
          <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>مؤكد</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>تم الشحن</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>تم التوصيل</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>ملغي</option>
        </select>
        <a href="tel:${escapeHtml(order.customer_phone)}" class="btn-secondary" style="padding: 8px 16px; font-size: 13px;">
          📞 اتصال
        </a>
        <button type="button" class="btn-icon danger" title="حذف الطلب" data-action="delete">🗑️</button>
      </div>
    `;

    // Safe Event Binding
    const selectEl = card.querySelector('.status-select');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    if (selectEl) {
      selectEl.addEventListener('change', (e) => updateOrderStatus(order.id, e.target.value));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deleteOrder(order.id, order.customer_name));
    }

    ordersListEl.appendChild(card);
  });
}

/**
 * Update Order Status
 */
async function updateOrderStatus(orderId, newStatus) {
  try {
    const client = window.SUPABASE_CONFIG.getClient();
    const { error } = await client
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;

    await loadOrders();
  } catch (err) {
    console.error('Error updating order status:', err);
    alert('فشل تحديث حالة الطلب: ' + err.message);
  }
}

/**
 * Delete Order
 */
async function deleteOrder(id, customerName) {
  const confirmed = confirm(`هل أنت متأكد من رغبتك في حذف طلب "${customerName}"؟\nلا يمكن التراجع عن هذه الخطوة.`);
  if (!confirmed) return;

  try {
    const client = window.SUPABASE_CONFIG.getClient();
    const { error } = await client
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('تم حذف الطلب بنجاح');
    await loadOrders();
  } catch (err) {
    console.error('Error deleting order:', err);
    alert('فشل حذف الطلب: ' + err.message);
  }
}

/**
 * Filter Orders by Status & Highlight Active Filter Button
 */
function filterOrders(status) {
  currentFilter = status;

  // Visual active button state styling
  const filterBtns = document.querySelectorAll('.panel button[onclick^="filterOrders"]');
  filterBtns.forEach(btn => {
    if (btn.getAttribute('onclick').includes(`'${status}'`)) {
      btn.style.background = 'var(--primary, #000)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--primary, #000)';
    } else {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.borderColor = '';
    }
  });

  if (status === 'all') {
    renderOrdersList(allOrders);
  } else {
    const filtered = allOrders.filter(order => order.status === status);
    renderOrdersList(filtered);
  }
}

/**
 * Get Status Text in Arabic
 */
function getStatusText(status) {
  const statusMap = {
    'pending': 'قيد الانتظار',
    'confirmed': 'مؤكد',
    'shipped': 'تم الشحن',
    'delivered': 'تم التوصيل',
    'cancelled': 'ملغي'
  };
  return statusMap[status] || status || 'قيد الانتظار';
}

/**
 * Format Date (Gregorian Arabic Format)
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Utility: Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}