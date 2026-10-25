/**
 * VISION collection — Retro Digi Watches
 * Merchant Admin Dashboard Logic
 * Full Supabase CRUD, Media Manager, and Max-3 Storefront Enforcement
 */

// Fallback for ADMIN_PASSCODE if not defined in window/supabase-config
const ADMIN_PASSCODE = window.ADMIN_PASSCODE || 'vis2000is';

// Available Local Photos from photos/ folder
const AVAILABLE_PHOTOS = [
  'photos/Picsart_26-10-17_13-27-12-392.png',
  'photos/5947419537978364127_121.jpg',
  'photos/5947419537978364128_121.jpg',
  'photos/5947419537978364129_121.jpg',
  'photos/5947419537978364130_121.jpg',
  'photos/5947419537978364132_121.jpg',
  'photos/5947419537978364133_121.jpg',
  'photos/5947419537978364134_121.jpg',
  'photos/5947419537978364135_121.jpg',
  'photos/5947419537978364136_121.jpg',
  'photos/5947419537978364137_121.jpg'
];

// State
let allPosts = [];
let currentNewMedia = []; // [{url: string, type: 'image'|'video'}]
let editingPostId = null;
let editingMedia = [];
let selectedPickerPhotos = new Set();
let pickerTarget = 'new'; // 'new' or 'edit'

// Admin Passcode Protection
function resolveAssetPath(path) {
  if (!path || path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const isInsideAdminDir = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '').endsWith('/admin');
  if (isInsideAdminDir && !path.startsWith('../')) {
    return '../' + path;
  }
  return path;
}

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
  initAdmin();
});

async function initAdmin() {
  checkAdminAuth();
  setupEventListeners();
  renderPhotoPickerGrid();
  await loadPosts();
}

/**
 * Load Posts from Supabase
 */
async function loadPosts() {
  const postsListEl = document.getElementById('posts-list');
  const countBadgeEl = document.getElementById('total-posts-count');
  const statusPillEl = document.getElementById('storefront-status-pill');

  if (!postsListEl) return;
  postsListEl.innerHTML = '<div class="empty-state"><span>⏳</span>جاري تحميل المنشورات...</div>';

  try {
    const client = window.SUPABASE_CONFIG?.getClient ? window.SUPABASE_CONFIG.getClient() : null;
    if (!client) {
      throw new Error('لم يتم تهيئة اتصال Supabase بنجاح (فحص supabase-config.js)');
    }

    const { data, error } = await client
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allPosts = data || [];
    const activeCount = allPosts.filter(p => p.is_active).length;

    // Update Header Pill
    if (statusPillEl) {
      statusPillEl.textContent = `المعروض في الواجهة: ${activeCount} / 3`;
      if (activeCount >= 3) {
        statusPillEl.className = 'status-pill full';
        statusPillEl.textContent = `المعروض في الواجهة: 3 / 3 (الحد الأقصى)`;
      } else {
        statusPillEl.className = 'status-pill';
      }
    }

    if (countBadgeEl) {
      countBadgeEl.textContent = `${allPosts.length} منشور`;
    }

    renderPostsList(allPosts);

  } catch (err) {
    console.error('Error fetching posts:', err);
    postsListEl.innerHTML = `
      <div class="empty-state">
        <span>⚠️</span>
        <p>حدث خطأ أثناء الاتصال بقاعدة البيانات.</p>
        <small style="color:var(--text-muted);">${escapeHtml(err.message)}</small>
        <br><br>
        <button class="btn-secondary" onclick="loadPosts()">إعادة المحاولة</button>
      </div>
    `;
  }
}

/**
 * Render Posts List with Safe Event Listeners
 */
function renderPostsList(posts) {
  const postsListEl = document.getElementById('posts-list');
  if (!postsListEl) return;

  if (posts.length === 0) {
    postsListEl.innerHTML = `
      <div class="empty-state">
        <span>📦</span>
        <p>لا توجد منشورات حتى الآن.</p>
        <small>قم بملء النموذج على اليمين لإضافة أول منشور لساعات VISION!</small>
      </div>
    `;
    return;
  }

  postsListEl.innerHTML = '';

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'post-card';

    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
    const mediaTypes = Array.isArray(post.media_types) ? post.media_types : [];
    const firstUrl = mediaUrls[0] || 'images/hero-watch.png';
    const resolvedFirstUrl = resolveAssetPath(firstUrl);
    const fallbackWatch = resolveAssetPath('images/hero-watch.png');
    const isFirstVideo = (mediaTypes[0] === 'video') || (typeof firstUrl === 'string' && firstUrl.match(/\.(mp4|webm|mov)$/i));

    let thumbHtml = '';
    if (isFirstVideo) {
      thumbHtml = `<video src="${resolvedFirstUrl}#t=0.5" preload="metadata" muted></video>`;
    } else {
      thumbHtml = `<img src="${resolvedFirstUrl}" alt="${escapeHtml(post.title)}" onerror="this.src='${fallbackWatch}'">`;
    }

    const videoCount = mediaTypes.filter(t => t === 'video').length;
    const imgCount = mediaUrls.length - videoCount;

    card.innerHTML = `
      <div class="post-card-thumb">
        ${thumbHtml}
      </div>
      <div class="post-card-info">
        <h3>${escapeHtml(post.title)}</h3>
        <div class="post-card-meta">
          <span class="meta-price">${post.price !== null && post.price !== undefined ? post.price + 'DZD' : 'بدون سعر'}</span>
          <span class="meta-tag">${escapeHtml(post.tag || 'Retro digi')}</span>
          <span class="meta-media-count">
            ${imgCount > 0 ? `📷 ${imgCount} صور` : ''} 
            ${videoCount > 0 ? `🎥 ${videoCount} فيديو` : ''}
          </span>
        </div>
        ${post.description ? `<p class="post-card-desc">${escapeHtml(post.description)}</p>` : ''}
      </div>
      <div class="post-card-controls">
        <button type="button" class="storefront-badge ${post.is_active ? 'active' : 'inactive'}" 
          title="انقر لتبديل العرض في واجهة الزبائن"
          data-action="toggle">
          ${post.is_active ? '● معروض بالواجهة' : '○ مخفي من الواجهة'}
        </button>
        <div class="post-actions">
          <button type="button" class="btn-icon" title="تعديل المنشور" data-action="edit">✏️</button>
          <button type="button" class="btn-icon danger" title="حذف المنشور" data-action="delete">🗑️</button>
        </div>
      </div>
    `;

    // Safe Event Listeners Binding
    const toggleBtn = card.querySelector('[data-action="toggle"]');
    const editBtn = card.querySelector('[data-action="edit"]');
    const deleteBtn = card.querySelector('[data-action="delete"]');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => togglePostActive(post.id, post.is_active));
    }
    if (editBtn) {
      editBtn.addEventListener('click', () => openEditModal(post.id));
    }
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => deletePost(post.id, post.title));
    }

    postsListEl.appendChild(card);
  });
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  const postForm = document.getElementById('new-post-form');
  if (postForm) {
    postForm.addEventListener('submit', handleNewPostSubmit);
  }

  const addUrlBtn = document.getElementById('btn-add-url');
  if (addUrlBtn) {
    addUrlBtn.addEventListener('click', () => {
      const urlInput = document.getElementById('media-url-input');
      const typeSelect = document.getElementById('media-type-select');
      const url = urlInput.value.trim();
      const type = typeSelect.value;

      if (!url) {
        alert('يرجى إدخال رابط الصورة أو الفيديو أولاً');
        return;
      }

      currentNewMedia.push({ url, type });
      urlInput.value = '';
      renderMediaItemsList('new-media-list', currentNewMedia);
    });
  }

  // File Upload (Device) with Compression Check
  const fileInput = document.getElementById('file-upload-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        // Prevent huge file uploads via DataURL
        if (file.size > 5 * 1024 * 1024) { // 5MB limit check
          alert(`حجم الملف "${file.name}" كبير جداً (${(file.size / (1024*1024)).toFixed(1)}MB). يرجى اختيار ملف أقل من 5 ميجابايت.`);
          return;
        }

        const isVideo = file.type.startsWith('video');
        const reader = new FileReader();
        reader.onload = (event) => {
          currentNewMedia.push({
            url: event.target.result,
            type: isVideo ? 'video' : 'image'
          });
          renderMediaItemsList('new-media-list', currentNewMedia);
        };
        reader.readAsDataURL(file);
      });
      fileInput.value = '';
    });
  }

  const openPickerBtn = document.getElementById('btn-open-picker');
  if (openPickerBtn) {
    openPickerBtn.addEventListener('click', () => openPhotoPicker('new'));
  }

  const openEditPickerBtn = document.getElementById('btn-open-edit-picker');
  if (openEditPickerBtn) {
    openEditPickerBtn.addEventListener('click', () => openPhotoPicker('edit'));
  }

  const confirmPickerBtn = document.getElementById('btn-confirm-picker');
  if (confirmPickerBtn) {
    confirmPickerBtn.addEventListener('click', confirmPhotoPickerSelection);
  }

  const editForm = document.getElementById('edit-post-form');
  if (editForm) {
    editForm.addEventListener('submit', handleEditPostSubmit);
  }

  const addEditUrlBtn = document.getElementById('btn-add-edit-url');
  if (addEditUrlBtn) {
    addEditUrlBtn.addEventListener('click', () => {
      const urlInput = document.getElementById('edit-media-url-input');
      const typeSelect = document.getElementById('edit-media-type-select');
      const url = urlInput.value.trim();
      const type = typeSelect.value;

      if (!url) {
        alert('يرجى إدخال الرابط');
        return;
      }

      editingMedia.push({ url, type });
      urlInput.value = '';
      renderMediaItemsList('edit-media-list', editingMedia);
    });
  }
}

/**
 * Handle New Post Submission
 */
async function handleNewPostSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('post-title').value.trim();
  const priceRaw = document.getElementById('post-price').value.trim();
  const tag = document.getElementById('post-tag').value.trim() || 'Retro digi';
  const description = document.getElementById('post-desc').value.trim();
  let isActive = document.getElementById('post-is-active').checked;

  if (!title) {
    alert('يرجى كتابة اسم المنشور / الساعة');
    return;
  }

  let price = null;
  if (priceRaw) {
    price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) {
      alert('يرجى إدخال سعر صحيح (أرقام فقط)');
      return;
    }
  }

  if (currentNewMedia.length === 0) {
    alert('يرجى إضافة صورة أو فيديو واحد على الأقل للمنشور');
    return;
  }

  // Enforce Max 3 Active Posts Limit
  if (isActive) {
    const currentActiveCount = allPosts.filter(p => p.is_active).length;
    if (currentActiveCount >= 3) {
      const proceedWithoutActive = confirm(
        '⚠️ تنبيه الحد الأقصى:\nيوجد حالياً 3 منشورات معروضة في واجهة الزبائن (الحد الأقصى).\n\nهل ترغب في حفظ هذا المنشور كـ "مخفي" الآن؟ يمكنك تفعيله لاحقاً بعد إلغاء تفعيل منشور قديم.'
      );
      if (!proceedWithoutActive) {
        return;
      }
      document.getElementById('post-is-active').checked = false;
      isActive = false;
    }
  }

  const mediaUrls = currentNewMedia.map(m => m.url);
  const mediaTypes = currentNewMedia.map(m => m.type);

  const submitBtn = document.getElementById('btn-submit-post');
  submitBtn.disabled = true;
  submitBtn.textContent = 'جاري النشر...';

  try {
    const client = window.SUPABASE_CONFIG.getClient();
    const { error } = await client
      .from('posts')
      .insert([
        {
          title,
          price,
          description,
          media_urls: mediaUrls,
          media_types: mediaTypes,
          is_active: isActive,
          tag
        }
      ]);

    if (error) throw error;

    alert('✅ تم نشر المنشور بنجاح!');
    
    e.target.reset();
    currentNewMedia = [];
    renderMediaItemsList('new-media-list', currentNewMedia);

    await loadPosts();

  } catch (err) {
    console.error('Error creating post:', err);
    alert('حدث خطأ أثناء حفظ المنشور: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '🚀 نشر المنشور في المتجر';
  }
}

/**
 * Toggle Post Active Status (Storefront visibility)
 */
async function togglePostActive(id, currentStatus) {
  const newStatus = !currentStatus;

  if (newStatus) {
    const activeCount = allPosts.filter(p => p.is_active && p.id !== id).length;
    if (activeCount >= 3) {
      alert(
        '⚠️ لا يمكن تفعيل هذا المنشور في الواجهة!\n\nيسمح بـ 3 منشورات كحد أقصى في واجهة الزبائن.\nيرجى إلغاء تفعيل منشور نشط أولاً لإفساح المجال.'
      );
      return;
    }
  }

  try {
    const client = window.SUPABASE_CONFIG.getClient();
    const { error } = await client
      .from('posts')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (error) throw error;

    await loadPosts();
  } catch (err) {
    console.error('Error toggling status:', err);
    alert('فشل تحديث حالة المنشور: ' + err.message);
  }
}

/**
 * Delete Post
 */
async function deletePost(id, title) {
  const confirmed = confirm(`هل أنت متأكد من رغبتك في حذف منشور "${title}"؟\nلا يمكن التراجع عن هذه الخطوة.`);
  if (!confirmed) return;

  try {
    const client = window.SUPABASE_CONFIG.getClient();
    const { error } = await client
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    alert('تم حذف المنشور بنجاح');
    await loadPosts();
  } catch (err) {
    console.error('Error deleting post:', err);
    alert('فشل حذف المنشور: ' + err.message);
  }
}

/**
 * Open Edit Modal
 */
function openEditModal(id) {
  const post = allPosts.find(p => p.id === id);
  if (!post) return;

  editingPostId = id;
  document.getElementById('edit-post-title').value = post.title || '';
  document.getElementById('edit-post-price').value = post.price !== null ? post.price : '';
  document.getElementById('edit-post-tag').value = post.tag || 'Retro digi';
  document.getElementById('edit-post-desc').value = post.description || '';
  document.getElementById('edit-post-is-active').checked = !!post.is_active;

  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
  const mediaTypes = Array.isArray(post.media_types) ? post.media_types : [];
  editingMedia = mediaUrls.map((url, idx) => ({
    url,
    type: mediaTypes[idx] || (url.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image')
  }));

  renderMediaItemsList('edit-media-list', editingMedia);

  const modal = document.getElementById('edit-modal');
  if (modal) modal.classList.add('active');
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  if (modal) modal.classList.remove('active');
  editingPostId = null;
  editingMedia = [];
}

/**
 * Handle Edit Post Submit
 */
async function handleEditPostSubmit(e) {
  e.preventDefault();
  if (!editingPostId) return;

  const title = document.getElementById('edit-post-title').value.trim();
  const priceRaw = document.getElementById('edit-post-price').value.trim();
  const tag = document.getElementById('edit-post-tag').value.trim() || 'Retro digi';
  const description = document.getElementById('edit-post-desc').value.trim();
  const isActive = document.getElementById('edit-post-is-active').checked;

  if (!title) {
    alert('يرجى إدخال اسم المنشور');
    return;
  }

  let price = null;
  if (priceRaw) {
    price = parseFloat(priceRaw.replace(/[^0-9.]/g, ''));
    if (isNaN(price)) {
      alert('يرجى إدخال سعر رقمي صحيح');
      return;
    }
  }

  if (editingMedia.length === 0) {
    alert('يرجى إبقاء صورة أو فيديو واحد على الأقل');
    return;
  }

  if (isActive) {
    const activeCount = allPosts.filter(p => p.is_active && p.id !== editingPostId).length;
    if (activeCount >= 3) {
      alert(
        '⚠️ لا يمكن عرض هذا المنشور في الواجهة حالياً!\nيوجد 3 منشورات معروضة بالفعل. قم بإلغاء تفعيل منشور قديم أولاً.'
      );
      return;
    }
  }

  const mediaUrls = editingMedia.map(m => m.url);
  const mediaTypes = editingMedia.map(m => m.type);

  try {
    const client = window.SUPABASE_CONFIG.getClient();
    const { error } = await client
      .from('posts')
      .update({
        title,
        price,
        description,
        tag,
        media_urls: mediaUrls,
        media_types: mediaTypes,
        is_active: isActive
      })
      .eq('id', editingPostId);

    if (error) throw error;

    alert('✅ تم تحديث المنشور بنجاح');
    closeEditModal();
    await loadPosts();
  } catch (err) {
    console.error('Error updating post:', err);
    alert('فشل تحديث المنشور: ' + err.message);
  }
}

/**
 * Render Media Items in Form (New or Edit)
 */
function renderMediaItemsList(containerId, mediaArray) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (mediaArray.length === 0) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:12px;">لم يتم إضافة وسائط بعد.</span>';
    return;
  }

  container.innerHTML = '';

  mediaArray.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'media-item-card';

    const resolvedUrl = resolveAssetPath(item.url);
    const fallbackWatch = resolveAssetPath('images/hero-watch.png');

    if (item.type === 'video') {
      card.innerHTML = `
        <video src="${resolvedUrl}#t=0.5" muted></video>
        <span class="media-item-badge">🎥 فيديو</span>
        <button type="button" class="media-item-remove" title="حذف" data-index="${index}">✕</button>
      `;
    } else {
      card.innerHTML = `
        <img src="${resolvedUrl}" alt="media" onerror="this.src='${fallbackWatch}'">
        <span class="media-item-badge">📷 صورة</span>
        <button type="button" class="media-item-remove" title="حذف" data-index="${index}">✕</button>
      `;
    }

    const removeBtn = card.querySelector('.media-item-remove');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => removeMediaItem(containerId, index));
    }

    container.appendChild(card);
  });
}

function removeMediaItem(containerId, index) {
  if (containerId === 'new-media-list') {
    currentNewMedia.splice(index, 1);
    renderMediaItemsList('new-media-list', currentNewMedia);
  } else if (containerId === 'edit-media-list') {
    editingMedia.splice(index, 1);
    renderMediaItemsList('edit-media-list', editingMedia);
  }
}

/**
 * Photo Picker Modal
 */
function openPhotoPicker(target) {
  pickerTarget = target;
  selectedPickerPhotos.clear();

  const modal = document.getElementById('photo-picker-modal');
  if (modal) {
    renderPhotoPickerGrid();
    modal.classList.add('active');
  }
}

function closePhotoPicker() {
  const modal = document.getElementById('photo-picker-modal');
  if (modal) modal.classList.remove('active');
}

function renderPhotoPickerGrid() {
  const grid = document.getElementById('photo-picker-grid');
  if (!grid) return;

  grid.innerHTML = '';

  AVAILABLE_PHOTOS.forEach(photoPath => {
    const item = document.createElement('div');
    item.className = `photo-picker-item ${selectedPickerPhotos.has(photoPath) ? 'selected' : ''}`;
    item.innerHTML = `<img src="${resolveAssetPath(photoPath)}" alt="watch photo" loading="lazy">`;

    item.addEventListener('click', () => {
      if (selectedPickerPhotos.has(photoPath)) {
        selectedPickerPhotos.delete(photoPath);
        item.classList.remove('selected');
      } else {
        selectedPickerPhotos.add(photoPath);
        item.classList.add('selected');
      }
    });

    grid.appendChild(item);
  });
}

function confirmPhotoPickerSelection() {
  if (selectedPickerPhotos.size === 0) {
    alert('يرجى اختيار صورة واحدة على الأقل');
    return;
  }

  selectedPickerPhotos.forEach(photoPath => {
    if (pickerTarget === 'new') {
      currentNewMedia.push({ url: photoPath, type: 'image' });
    } else {
      editingMedia.push({ url: photoPath, type: 'image' });
    }
  });

  if (pickerTarget === 'new') {
    renderMediaItemsList('new-media-list', currentNewMedia);
  } else {
    renderMediaItemsList('edit-media-list', editingMedia);
  }

  closePhotoPicker();
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