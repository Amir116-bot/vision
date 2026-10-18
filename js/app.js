/**
 * VISION collection — Retro Digi Watches
 * Customer Storefront Application Logic
 * Supabase Data Fetching & Interactive Zoom Modal ("تقريب الواجهة")
 */

// Default Fallback Products (used if Supabase is offline or empty)
const DEFAULT_POSTS = [
  {
    id: 'default-sabrina',
    title: 'Sabrina',
    price: 780,
    tag: 'Retro digi',
    description: 'Retro digi: the 2000s digital display, rebuilt into a classic steel case. Pixel-grid dials, polished bracelets and quartz precision, in one watch.\n\nWater resistant to 50m with scratch-resistant mineral crystal and iconic blue backlight.',
    media_urls: ['images/sabrina.png', 'photos/5947419537978364127_121.jpg', 'photos/5947419537978364128_121.jpg'],
    media_types: ['image', 'image', 'image']
  },
  {
    id: 'default-naomi',
    title: 'Naomi',
    price: 640,
    tag: 'Retro digi',
    description: 'A striking crimson-dial digital edition with brushed steel links. Inspired by vintage Japanese micro-electronics and cyberpunk street style.\n\nFeatures 24-hour dual time, chronograph, and high-contrast digital segment digits.',
    media_urls: ['images/naomi.jpg', 'photos/5947419537978364132_121.jpg', 'photos/5947419537978364133_121.jpg'],
    media_types: ['image', 'image', 'image']
  }
];

// Current State
let currentPosts = [];
let activeModalPost = null;
let currentMediaIndex = 0;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Route /admin or #admin to admin portal
  if (window.location.hash.toLowerCase() === '#admin' || window.location.pathname.replace(/\/$/, '').endsWith('/admin')) {
    window.location.href = 'admin/';
    return;
  }
  initApp();
  setupModalEvents();
});

async function initApp() {
  const cardsContainer = document.getElementById('dynamic-cards');
  if (!cardsContainer) return;

  try {
    const client = window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.getClient() : null;
    
    if (client) {
      // Query up to 3 active posts for the storefront
      const { data, error } = await client
        .from('posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data && data.length > 0) {
        currentPosts = data;
        renderCards(currentPosts);
        return;
      }
    }
  } catch (err) {
    console.warn('Could not fetch posts from Supabase, rendering defaults:', err);
  }

  // Fallback to default posts
  currentPosts = DEFAULT_POSTS;
  renderCards(currentPosts);
}

/**
 * Render Post Cards in Storefront
 */
function renderCards(posts) {
  const cardsContainer = document.getElementById('dynamic-cards');
  if (!cardsContainer) return;

  cardsContainer.innerHTML = '';

  posts.forEach((post, index) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `View details for ${post.title}`);

    // Main media preview (first item)
    const mediaUrls = Array.isArray(post.media_urls) && post.media_urls.length > 0
      ? post.media_urls
      : ['images/hero-watch.png'];
    
    const mediaTypes = Array.isArray(post.media_types)
      ? post.media_types
      : [];

    const firstUrl = mediaUrls[0];
    const isFirstVideo = (mediaTypes[0] === 'video') || (typeof firstUrl === 'string' && firstUrl.match(/\.(mp4|webm|mov)$/i));

    // Media element
    let mediaHtml = '';
    if (isFirstVideo) {
      mediaHtml = `<video src="${firstUrl}" muted loop playsinline autoplay></video>`;
    } else {
      mediaHtml = `<img src="${firstUrl}" alt="${escapeHtml(post.title)}" loading="lazy">`;
    }

    // Media count badge if multiple media files exist
    const totalMedia = mediaUrls.length;
    let badgeHtml = '';
    if (totalMedia > 1) {
      const videoCount = mediaTypes.filter(t => t === 'video').length;
      const imgCount = totalMedia - videoCount;
      badgeHtml = `<span class="media-count-badge" title="${totalMedia} media files">
        ${imgCount > 0 ? `📷 ${imgCount}` : ''} ${videoCount > 0 ? `🎥 ${videoCount}` : ''}
      </span>`;
    }

    const priceText = post.price !== null && post.price !== undefined ? `${post.price}$` : '';
    const tagText = post.tag || 'Retro digi';

    card.innerHTML = `
      <div class="frame">
        <span class="tag">${escapeHtml(tagText)}</span>
        ${badgeHtml}
        ${mediaHtml}
      </div>
      <div class="row">
        <div>
          <h3>${escapeHtml(post.title)}</h3>
          <small>${escapeHtml(priceText)}</small>
        </div>
        <button type="button" class="btn light" aria-label="Open details">Learn more</button>
      </div>
      ${post.description ? `<p class="card-desc-preview">${escapeHtml(post.description)}</p>` : ''}
    `;

    // Click to open Zoom Modal
    card.addEventListener('click', () => openZoomModal(post));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openZoomModal(post);
      }
    });

    cardsContainer.appendChild(card);
  });
}

/**
 * Open Zoom-In Modal ("تتقترب منه واجهة")
 */
function openZoomModal(post) {
  activeModalPost = post;
  currentMediaIndex = 0;

  const backdrop = document.getElementById('zoom-modal-backdrop');
  if (!backdrop) return;

  // Title, Price, Description, Tag
  document.getElementById('modal-title').textContent = post.title || 'VISION Retro Digi';
  document.getElementById('modal-price').textContent = post.price ? `${post.price}$` : 'N/A';
  document.getElementById('modal-desc').textContent = post.description || 'No description provided.';
  
  const tagEl = document.getElementById('modal-tag');
  if (tagEl) {
    tagEl.textContent = post.tag || 'Retro digi';
  }

  // Setup order form
  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.addEventListener('submit', handleOrderSubmit);
  }

  // Render Media Gallery
  renderModalMediaGallery();

  // Show Modal with Spring-Zoom animation
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * Render Media Gallery inside Zoom Modal
 */
function renderModalMediaGallery() {
  if (!activeModalPost) return;

  const mediaUrls = Array.isArray(activeModalPost.media_urls) && activeModalPost.media_urls.length > 0
    ? activeModalPost.media_urls
    : ['images/hero-watch.png'];

  const mediaTypes = Array.isArray(activeModalPost.media_types)
    ? activeModalPost.media_types
    : [];

  const displayEl = document.getElementById('modal-media-display');
  const thumbsStrip = document.getElementById('modal-thumbs-strip');
  const counterEl = document.getElementById('modal-media-counter');
  const prevBtn = document.getElementById('modal-prev-btn');
  const nextBtn = document.getElementById('modal-next-btn');

  // Normalize index
  if (currentMediaIndex < 0) currentMediaIndex = mediaUrls.length - 1;
  if (currentMediaIndex >= mediaUrls.length) currentMediaIndex = 0;

  const currentUrl = mediaUrls[currentMediaIndex];
  const isVideo = (mediaTypes[currentMediaIndex] === 'video') || (typeof currentUrl === 'string' && currentUrl.match(/\.(mp4|webm|mov)$/i));

  // Display Current Media
  if (isVideo) {
    displayEl.innerHTML = `
      <video class="zoom-main-video" src="${currentUrl}" controls autoplay loop playsinline></video>
    `;
  } else {
    displayEl.innerHTML = `
      <img class="zoom-main-img" src="${currentUrl}" alt="${escapeHtml(activeModalPost.title)}">
    `;
  }

  // Update Counter
  if (counterEl) {
    counterEl.textContent = `${currentMediaIndex + 1} / ${mediaUrls.length}`;
    counterEl.style.display = mediaUrls.length > 1 ? 'block' : 'none';
  }

  // Show/Hide Nav Buttons
  if (prevBtn && nextBtn) {
    prevBtn.style.display = mediaUrls.length > 1 ? 'grid' : 'none';
    nextBtn.style.display = mediaUrls.length > 1 ? 'grid' : 'none';
  }

  // Render Thumbnails
  if (thumbsStrip) {
    if (mediaUrls.length > 1) {
      thumbsStrip.style.display = 'flex';
      thumbsStrip.innerHTML = '';

      mediaUrls.forEach((url, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `zoom-thumb ${idx === currentMediaIndex ? 'active' : ''}`;
        thumb.setAttribute('role', 'button');
        thumb.setAttribute('aria-label', `Media ${idx + 1}`);

        const isThumbVideo = (mediaTypes[idx] === 'video') || (typeof url === 'string' && url.match(/\.(mp4|webm|mov)$/i));

        if (isThumbVideo) {
          thumb.innerHTML = `
            <video src="${url}#t=0.5" preload="metadata" muted></video>
            <span class="zoom-thumb-video-icon">▶</span>
          `;
        } else {
          thumb.innerHTML = `<img src="${url}" alt="thumbnail">`;
        }

        thumb.addEventListener('click', () => {
          currentMediaIndex = idx;
          renderModalMediaGallery();
        });

        thumbsStrip.appendChild(thumb);
      });
    } else {
      thumbsStrip.style.display = 'none';
    }
  }
}

/**
 * Close Zoom Modal
 */
function closeZoomModal() {
  const backdrop = document.getElementById('zoom-modal-backdrop');
  if (!backdrop) return;

  // Stop any video playing
  const video = backdrop.querySelector('video');
  if (video) {
    video.pause();
  }

  backdrop.classList.remove('active');
  document.body.style.overflow = '';
  activeModalPost = null;
}

/**
 * Setup Event Listeners for Modal
 */
function setupModalEvents() {
  const backdrop = document.getElementById('zoom-modal-backdrop');
  const closeBtn = document.getElementById('zoom-modal-close');
  const prevBtn = document.getElementById('modal-prev-btn');
  const nextBtn = document.getElementById('modal-next-btn');

  if (closeBtn) {
    closeBtn.addEventListener('click', closeZoomModal);
  }

  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeZoomModal();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentMediaIndex--;
      renderModalMediaGallery();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentMediaIndex++;
      renderModalMediaGallery();
    });
  }

  // Keyboard navigation (Escape to close, Left/Right arrows to cycle media)
  document.addEventListener('keydown', (e) => {
    if (!backdrop || !backdrop.classList.contains('active')) return;

    if (e.key === 'Escape') {
      closeZoomModal();
    } else if (e.key === 'ArrowLeft') {
      currentMediaIndex--;
      renderModalMediaGallery();
    } else if (e.key === 'ArrowRight') {
      currentMediaIndex++;
      renderModalMediaGallery();
    }
  });
}

/**
 * Handle Order Form Submission
 */
async function handleOrderSubmit(e) {
  e.preventDefault();
  
  if (!activeModalPost) {
    alert('حدث خطأ: لم يتم تحديد المنتج');
    return;
  }

  const formData = new FormData(e.target);
  const selectedColor = formData.get('color');
  const customerName = formData.get('customer_name');
  const customerPhone = formData.get('customer_phone');
  const customerAddress = formData.get('customer_address');
  const customerCity = formData.get('customer_city');
  const customerEmail = formData.get('customer_email');
  const orderNotes = formData.get('order_notes');

  // Validation
  if (!selectedColor || !customerName || !customerPhone || !customerAddress) {
    alert('يرجى ملء جميع الحقول المطلوبة');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>⏳</span> <span>جاري إرسال الطلب...</span>';

  try {
    const client = window.SUPABASE_CONFIG ? window.SUPABASE_CONFIG.getClient() : null;
    
    if (!client) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await client
      .from('orders')
      .insert([
        {
          post_id: activeModalPost.id,
          post_title: activeModalPost.title,
          post_price: activeModalPost.price,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          customer_city: customerCity || null,
          customer_email: customerEmail || null,
          selected_color: selectedColor,
          order_notes: orderNotes || null,
          status: 'pending'
        }
      ]);

    if (error) throw error;

    alert('✅ تم إرسال طلبك بنجاح!\nسنتواصل معك قريباً لتأكيد الطلب.');
    closeZoomModal();
    e.target.reset();

  } catch (err) {
    console.error('Error submitting order:', err);
    alert('حدث خطأ أثناء إرسال الطلب: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>🛒</span> <span>تأكيد الطلب</span>';
  }
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
