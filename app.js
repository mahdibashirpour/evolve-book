// ============================================
// Config & Constants
// ============================================

const BASE_URL = 'https://evolve-book.s3.ir-thr-at1.arvanstorage.ir/Evolve';
const BOOK_COUNT = 6;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// نام فایل‌های اصلی که باید در Overview نمایش داده شوند
const MAIN_ASSETS = {
  cover: 'cover.jpg',
  studentBook: "Student's Book.pdf",
  teacherEdition: "Teacher's Edition.pdf",
  videoResource: 'Video Resource Book.pdf',
  workbook: 'Workbook.pdf',
};

// نام‌های فارسی برای PDFها
const PDF_NAMES = {
  studentBook: "کتاب دانش‌آموز",
  teacherEdition: "کتاب معلم",
  videoResource: "کتاب ویدیو",
  workbook: "کتاب کار",
};

/**
 * ساختار بخش‌های هر کتاب
 */
function getBookConfig(bookNumber) {
  const base = `${BASE_URL}/Evolve%20${bookNumber}/`;
  
  return {
    bookNumber,
    baseUrl: base,
    sections: [
      {
        key: 'audio',
        titleFa: 'صوتی',
        icon: '🎵',
        filesTxtUrl: `${base}Audio/files.txt`,
        basePathUrl: `${base}Audio/`,
      },
      {
        key: 'workbookAudio',
        titleFa: 'صوتی کتاب کار',
        icon: '📻',
        filesTxtUrl: `${base}Workbook%20Audio/files.txt`,
        basePathUrl: `${base}Workbook%20Audio/`,
      },
      {
        key: 'video',
        titleFa: 'ویدیو',
        icon: '🎬',
        filesTxtUrl: `${base}Video/files.txt`,
        basePathUrl: `${base}Video/`,
      },
      {
        key: 'documentary',
        titleFa: 'مستند',
        icon: '🎥',
        filesTxtUrl: `${base}Video/Documentary/files.txt`,
        basePathUrl: `${base}Video/Documentary/`,
      },
    ],
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * نرمال‌سازی نام برای مقایسه
 */
function normalizeName(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // حذف multiple spaces
    .replace(/[''"]/g, "'"); // normalize apostrophes
}

/**
 * پیدا کردن فایل‌های اصلی از لیست root files
 */
function findMainAssets(rootFiles) {
  const assets = {
    cover: null,
    studentBook: null,
    teacherEdition: null,
    videoResource: null,
    workbook: null,
  };

  rootFiles.forEach(file => {
    const normalized = normalizeName(file.name);
    const normalizedCover = normalizeName(MAIN_ASSETS.cover);
    const normalizedStudent = normalizeName(MAIN_ASSETS.studentBook);
    const normalizedTeacher = normalizeName(MAIN_ASSETS.teacherEdition);
    const normalizedVideo = normalizeName(MAIN_ASSETS.videoResource);
    const normalizedWorkbook = normalizeName(MAIN_ASSETS.workbook);

    if (normalized === normalizedCover) {
      assets.cover = file;
    } else if (normalized === normalizedStudent) {
      assets.studentBook = file;
    } else if (normalized === normalizedTeacher) {
      assets.teacherEdition = file;
    } else if (normalized === normalizedVideo) {
      assets.videoResource = file;
    } else if (normalized === normalizedWorkbook) {
      assets.workbook = file;
    }
  });

  return assets;
}

/**
 * دریافت پسوند فایل
 */
function getFileExtension(filename) {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Parse کردن محتوای files.txt
 */
function parseFilesTxt(content) {
  const trimmed = content.trim();
  if (!trimmed) return [];

  // روش اول: split با newline
  const lines = trimmed.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // اگر خطوط کافی داشت، برگردان
  if (lines.length >= 2) {
    return lines;
  }

  // روش دوم: regex برای استخراج فایل‌ها
  const extensions = ['pdf', 'mp3', 'mp4', 'jpg', 'jpeg', 'png', 'webm', 'wav', 'm4a', 'zip'];
  const pattern = new RegExp(
    `([^\\s]+?\\.(${extensions.join('|')}))(\\s+|$)`,
    'gi'
  );

  const matches = [];
  let match;
  while ((match = pattern.exec(trimmed)) !== null) {
    const filename = match[1].trim();
    if (filename) {
      matches.push(filename);
    }
  }

  return matches.length > 0 ? matches : lines;
}

/**
 * ساخت URL امن برای فایل
 */
function makeFileUrl(basePathUrl, filename) {
  const encodedFilename = encodeURIComponent(filename);
  return `${basePathUrl}${encodedFilename}`;
}

// ============================================
// Cache Management
// ============================================

function getCacheKey(bookNumber, sectionKey) {
  return `evolve_${bookNumber}_${sectionKey || 'root'}`;
}

function getCachedData(cacheKey) {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const entry = JSON.parse(cached);
    const now = Date.now();

    if (now - entry.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch (e) {
    console.error('Error reading cache:', e);
    return null;
  }
}

function setCachedData(cacheKey, data) {
  try {
    const entry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (e) {
    console.error('Error writing cache:', e);
  }
}

// ============================================
// Fetch Functions
// ============================================

/**
 * Fetch کردن files.txt با cache
 */
async function fetchTextWithCache(url, cacheKey) {
  // بررسی cache
  const cached = getCachedData(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        setCachedData(cacheKey, '');
        return '';
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    setCachedData(cacheKey, text);
    return text;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);

    // اگر خطا داشت ولی cache قدیمی وجود داشت، از آن استفاده کن
    if (cached !== null) {
      return cached;
    }

    throw error;
  }
}

/**
 * دریافت فایل‌های یک بخش
 */
async function fetchSectionFiles(bookNumber, section) {
  const cacheKey = getCacheKey(bookNumber, section.key);
  
  try {
    const text = await fetchTextWithCache(section.filesTxtUrl, cacheKey);
    if (!text) return [];

    const filenames = parseFilesTxt(text);
    return filenames.map(filename => ({
      name: filename,
      url: makeFileUrl(section.basePathUrl, filename),
      ext: getFileExtension(filename),
      section: section.key,
    }));
  } catch (error) {
    console.error('Error fetching section files:', error);
    return [];
  }
}

/**
 * دریافت فایل‌های root
 */
async function fetchRootFiles(bookNumber) {
  const base = `${BASE_URL}/Evolve%20${bookNumber}/`;
  const filesTxtUrl = `${base}files.txt`;
  const cacheKey = getCacheKey(bookNumber, 'root');

  try {
    const text = await fetchTextWithCache(filesTxtUrl, cacheKey);
    if (!text) return [];

    const filenames = parseFilesTxt(text);
    return filenames.map(filename => ({
      name: filename,
      url: makeFileUrl(base, filename),
      ext: getFileExtension(filename),
      section: 'root',
    }));
  } catch (error) {
    console.error('Error fetching root files:', error);
    return [];
  }
}

// ============================================
// Render Functions
// ============================================

/**
 * نمایش/مخفی کردن loading overlay
 */
function setLoading(show) {
  const overlay = document.getElementById('loading-overlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

/**
 * رندر صفحه اصلی
 */
function renderHome() {
  const homePage = document.getElementById('home-page');
  const bookPage = document.getElementById('book-page');
  
  homePage.classList.remove('hidden');
  bookPage.classList.add('hidden');
  
  // پاک کردن selector
  const selector = document.getElementById('book-selector');
  selector.value = '';
  
  // پاک کردن URL
  window.history.pushState({}, '', window.location.pathname);
  
  const booksGrid = document.getElementById('books-grid');
  booksGrid.innerHTML = '';

  for (let i = 1; i <= BOOK_COUNT; i++) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.onclick = () => renderBook(i);

    const base = `${BASE_URL}/Evolve%20${i}/`;
    const coverUrl = makeFileUrl(base, MAIN_ASSETS.cover);

    card.innerHTML = `
      <div class="book-card-cover">
        <img src="${coverUrl}" alt="Evolve ${i}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width: 100%; height: 100%; object-fit: cover;">
        <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 4rem;">📚</div>
      </div>
      <div class="book-card-body">
        <div class="book-card-title">Evolve ${i}</div>
        <a href="#" class="book-card-cta" onclick="event.preventDefault(); renderBook(${i});">ورود به کتاب</a>
      </div>
    `;

    booksGrid.appendChild(card);
  }
}

/**
 * رندر صفحه کتاب
 */
async function renderBook(bookNumber) {
  const homePage = document.getElementById('home-page');
  const bookPage = document.getElementById('book-page');
  
  homePage.classList.add('hidden');
  bookPage.classList.remove('hidden');
  
  // به‌روزرسانی selector
  const selector = document.getElementById('book-selector');
  selector.value = bookNumber;
  
  // به‌روزرسانی URL
  window.history.pushState({}, '', `?book=${bookNumber}`);
  
  const bookTitle = document.getElementById('book-title');
  bookTitle.textContent = `Evolve ${bookNumber}`;

  setLoading(true);

  try {
    // دریافت root files
    const rootFiles = await fetchRootFiles(bookNumber);
    const mainAssets = findMainAssets(rootFiles);

    // رندر Overview
    renderOverview(bookNumber, mainAssets);

    // دریافت و رندر بخش‌ها
    const config = getBookConfig(bookNumber);
    await renderSections(bookNumber, config.sections);
  } catch (error) {
    console.error('Error rendering book:', error);
    const overview = document.getElementById('book-overview');
    overview.innerHTML = '<div class="error-message">خطا در بارگذاری کتاب. لطفاً دوباره تلاش کنید.</div>';
  } finally {
    setLoading(false);
  }
}

/**
 * رندر Overview (Cover + PDFs)
 */
function renderOverview(bookNumber, assets) {
  const overview = document.getElementById('book-overview');
  const base = `${BASE_URL}/Evolve%20${bookNumber}/`;

  // Cover
  const coverContainer = document.getElementById('cover-container');
  const coverImg = document.getElementById('cover-img');
  const coverPlaceholder = coverContainer.querySelector('.cover-placeholder');

  if (assets.cover) {
    coverImg.src = assets.cover.url;
    coverImg.classList.add('loaded');
    coverPlaceholder.style.display = 'none';
  } else {
    coverImg.classList.remove('loaded');
    coverPlaceholder.style.display = 'flex';
  }

  // PDFs - با hierarchy
  const mainPdfs = document.getElementById('main-pdfs');
  mainPdfs.innerHTML = '';

  // Student's Book - Primary (بزرگ و برجسته)
  const studentBook = assets.studentBook;
  if (studentBook) {
    const fileData = encodeURIComponent(JSON.stringify(studentBook));
    const primaryCard = document.createElement('div');
    primaryCard.className = 'pdf-card pdf-card-primary';
    primaryCard.innerHTML = `
      <div class="pdf-card-icon-large">📚</div>
      <div class="pdf-card-title-large">${PDF_NAMES.studentBook}</div>
      <div class="pdf-card-subtitle">کتاب اصلی دانش‌آموز</div>
      <div class="pdf-card-actions">
        <button class="btn btn-primary btn-large" onclick="openPdfModalFromData('${fileData.replace(/'/g, "\\'")}')">
          <span>👁️</span>
          <span>مشاهده کتاب</span>
        </button>
        <a href="${studentBook.url}" download="${studentBook.name}" class="btn btn-success btn-large">
          <span>⬇️</span>
          <span>دانلود</span>
        </a>
      </div>
    `;
    mainPdfs.appendChild(primaryCard);
  }

  // سایر PDFها - Secondary (در یک container جداگانه)
  const secondaryContainer = document.createElement('div');
  secondaryContainer.className = 'pdf-cards-secondary';
  
  const secondaryPdfs = [
    { key: 'teacherEdition', name: PDF_NAMES.teacherEdition, file: assets.teacherEdition, icon: '👨‍🏫', subtitle: 'برای معلمان' },
    { key: 'videoResource', name: PDF_NAMES.videoResource, file: assets.videoResource, icon: '🎬', subtitle: 'منابع ویدیویی' },
    { key: 'workbook', name: PDF_NAMES.workbook, file: assets.workbook, icon: '✏️', subtitle: 'تمرین و کار' },
  ];

  secondaryPdfs.forEach(({ key, name, file, icon, subtitle }) => {
    const card = document.createElement('div');
    card.className = `pdf-card pdf-card-secondary ${!file ? 'disabled' : ''}`;

    if (file) {
      const fileData = encodeURIComponent(JSON.stringify(file)).replace(/'/g, "\\'");
      card.innerHTML = `
        <div class="pdf-card-icon">${icon}</div>
        <div class="pdf-card-title">${name}</div>
        <div class="pdf-card-subtitle">${subtitle}</div>
        <div class="pdf-card-actions">
          <button class="btn btn-primary" onclick="openPdfModalFromData('${fileData.replace(/'/g, "\\'")}')">مشاهده</button>
          <a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="pdf-card-icon">${icon}</div>
        <div class="pdf-card-title">${name}</div>
        <div class="pdf-card-subtitle">${subtitle}</div>
        <div class="pdf-card-badge">موجود نیست</div>
      `;
    }

    secondaryContainer.appendChild(card);
  });

  mainPdfs.appendChild(secondaryContainer);
}

/**
 * رندر بخش‌ها
 */
async function renderSections(bookNumber, sections) {
  const container = document.getElementById('sections-container');
  container.innerHTML = '';

  for (const section of sections) {
    const files = await fetchSectionFiles(bookNumber, section);
    
    const sectionCard = document.createElement('div');
    sectionCard.className = 'section-card';
    sectionCard.innerHTML = `
      <div class="section-header" onclick="toggleSection(this)">
        <div class="section-title">
          <span class="section-icon">${section.icon}</span>
          <span>${section.titleFa}</span>
        </div>
        <div class="section-meta">${files.length} فایل</div>
      </div>
      <div class="section-content">
        <div class="section-body" data-section-key="${section.key}">
          ${files.length > 0 ? renderFileList(files, section.key) : '<div class="error-message">محتوا موجود نیست</div>'}
        </div>
      </div>
    `;

    container.appendChild(sectionCard);
    
    // Initialize Plyr players after section is rendered
    if (files.length > 0) {
      setTimeout(() => {
        initializePlyrPlayers(section.key);
      }, 100);
    }
  }
}

/**
 * رندر لیست فایل‌ها
 */
function renderFileList(files, sectionKey) {
  // Toolbar
  const toolbar = `
    <div class="section-toolbar">
      <input type="text" class="search-box" placeholder="جستجو..." oninput="filterFiles(this, '${sectionKey}')" dir="ltr">
      <select class="sort-select" onchange="sortFiles(this, '${sectionKey}')">
        <option value="az">مرتب‌سازی: A-Z</option>
        <option value="za">مرتب‌سازی: Z-A</option>
      </select>
    </div>
  `;

  // Files list
  const filesHtml = files.map((file, index) => {
    const icon = getFileIcon(file.ext);
    const fileData = encodeURIComponent(JSON.stringify(file));

    // Video files - layout خاص
    if (isVideoFile(file.ext)) {
      return `
        <div class="file-item video-item" data-filename="${file.name.toLowerCase()}">
          <div class="video-container">
            <div class="video-wrapper">
              <video id="video-${sectionKey}-${index}" preload="metadata" class="plyr-video">
                <source src="${file.url}" type="video/${file.ext}">
              </video>
            </div>
            <div class="video-info">
              <div class="file-info">
                <span class="file-icon">${icon}</span>
                <span class="file-name" title="${file.name}">${file.name}</span>
              </div>
              <div class="file-actions">
                <a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // سایر فایل‌ها
    let actions = '';
    const escapedFileData = fileData.replace(/'/g, "\\'");
    if (isPdfFile(file.ext)) {
      actions = `
        <button class="btn btn-primary" onclick="openPdfModalFromData('${escapedFileData}')">مشاهده</button>
        <a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>
      `;
    } else if (isAudioFile(file.ext)) {
      actions = `
        <button class="btn btn-primary" onclick="playAudioFromData('${escapedFileData}', '${sectionKey}')">پخش</button>
        <a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>
      `;
    } else {
      actions = `<a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>`;
    }

    return `
      <div class="file-item" data-filename="${file.name.toLowerCase()}">
        <div class="file-info">
          <span class="file-icon">${icon}</span>
          <span class="file-name" title="${file.name}">${file.name}</span>
        </div>
        <div class="file-actions">${actions}</div>
      </div>
    `;
  }).join('');

  return toolbar + `<div class="files-list" data-original-files='${JSON.stringify(files)}'>${filesHtml}</div>`;
}

// ============================================
// Helper Functions for UI
// ============================================

function isAudioFile(ext) {
  return ['mp3', 'wav', 'm4a'].includes(ext);
}

function isVideoFile(ext) {
  return ['mp4', 'webm'].includes(ext);
}

function isPdfFile(ext) {
  return ext === 'pdf';
}

function getFileIcon(ext) {
  if (isPdfFile(ext)) return '📄';
  if (isAudioFile(ext)) return '🎵';
  if (isVideoFile(ext)) return '🎬';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  if (ext === 'zip') return '📦';
  return '📎';
}

// ============================================
// UI Interactions
// ============================================

/**
 * باز/بسته کردن section
 */
function toggleSection(header) {
  const content = header.nextElementSibling;
  const isOpen = content.classList.contains('open');
  
  if (isOpen) {
    content.classList.remove('open');
    header.classList.remove('active');
  } else {
    // بستن بقیه sections
    document.querySelectorAll('.section-content.open').forEach(el => {
      el.classList.remove('open');
      el.previousElementSibling.classList.remove('active');
    });
    
    content.classList.add('open');
    header.classList.add('active');
  }
}

/**
 * فیلتر فایل‌ها
 */
function filterFiles(input, sectionKey) {
  const query = input.value.toLowerCase().trim();
  const sectionBody = document.querySelector(`[data-section-key="${sectionKey}"]`);
  const filesList = sectionBody.querySelector('.files-list');
  const fileItems = filesList.querySelectorAll('.file-item');

  fileItems.forEach(item => {
    const filename = item.dataset.filename;
    if (filename.includes(query)) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * مرتب‌سازی فایل‌ها
 */
function sortFiles(select, sectionKey) {
  const sectionBody = document.querySelector(`[data-section-key="${sectionKey}"]`);
  const filesList = sectionBody.querySelector('.files-list');
  const filesData = JSON.parse(filesList.dataset.originalFiles);
  const order = select.value;

  filesData.sort((a, b) => {
    if (order === 'az') {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  filesList.innerHTML = filesData.map((file, index) => {
    const icon = getFileIcon(file.ext);
    const fileData = encodeURIComponent(JSON.stringify(file));

    // Video files - layout خاص
    if (isVideoFile(file.ext)) {
      return `
        <div class="file-item video-item" data-filename="${file.name.toLowerCase()}">
          <div class="video-container">
            <div class="video-wrapper">
              <video id="video-${sectionKey}-${index}" preload="metadata" class="plyr-video">
                <source src="${file.url}" type="video/${file.ext}">
              </video>
            </div>
            <div class="video-info">
              <div class="file-info">
                <span class="file-icon">${icon}</span>
                <span class="file-name" title="${file.name}">${file.name}</span>
              </div>
              <div class="file-actions">
                <a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // سایر فایل‌ها
    let actions = '';
    const escapedFileData = fileData.replace(/'/g, "\\'");
    if (isPdfFile(file.ext)) {
      actions = `
        <button class="btn btn-primary" onclick="openPdfModalFromData('${escapedFileData}')">مشاهده</button>
        <a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>
      `;
    } else if (isAudioFile(file.ext)) {
      const audioId = `audio-${sectionKey}-${index}`;
      return `
        <div class="file-item audio-item" data-filename="${file.name.toLowerCase()}">
          <div class="file-info">
            <span class="file-icon">${icon}</span>
            <span class="file-name" title="${file.name}">${file.name}</span>
          </div>
          <div class="file-actions">
            <audio id="${audioId}" class="plyr-audio" preload="metadata">
              <source src="${file.url}" type="audio/${file.ext}">
            </audio>
            <button class="btn btn-primary" onclick="playAudioFromData('${escapedFileData}', '${sectionKey}')" style="margin-top: 8px;">پخش در Player</button>
            <a href="${file.url}" download="${file.name}" class="btn btn-success" style="margin-top: 8px;">دانلود</a>
          </div>
        </div>
      `;
    } else {
      actions = `<a href="${file.url}" download="${file.name}" class="btn btn-success">دانلود</a>`;
    }

    if (!isAudioFile(file.ext)) {
      return `
        <div class="file-item" data-filename="${file.name.toLowerCase()}">
          <div class="file-info">
            <span class="file-icon">${icon}</span>
            <span class="file-name" title="${file.name}">${file.name}</span>
          </div>
          <div class="file-actions">${actions}</div>
        </div>
      `;
    }
  }).join('');

  // Initialize Plyr after rendering
  setTimeout(() => {
    initializePlyrPlayers(sectionKey);
  }, 100);

  // حفظ فیلتر جستجو
  const searchBox = sectionBody.querySelector('.search-box');
  if (searchBox.value) {
    filterFiles(searchBox, sectionKey);
  }
}

// ============================================
// PDF Modal
// ============================================

function openPdfModalFromData(fileDataEncoded) {
  const file = JSON.parse(decodeURIComponent(fileDataEncoded));
  openPdfModal(file);
}

function openPdfModal(file) {
  const modal = document.getElementById('pdf-modal');
  const modalTitle = document.getElementById('modal-title');
  const pdfIframe = document.getElementById('pdf-iframe');
  const modalOpenTab = document.getElementById('modal-open-tab');
  const modalDownload = document.getElementById('modal-download');

  modalTitle.textContent = file.name;
  pdfIframe.src = file.url;
  modalOpenTab.href = file.url;
  modalDownload.href = file.url;
  modalDownload.download = file.name;

  modal.classList.remove('hidden');

  // بستن Modal
  const closeBtn = document.getElementById('modal-close');
  closeBtn.onclick = closePdfModal;

  // بستن با کلیک روی پس‌زمینه
  modal.onclick = (e) => {
    if (e.target === modal) {
      closePdfModal();
    }
  };
}

function closePdfModal() {
  const modal = document.getElementById('pdf-modal');
  const pdfIframe = document.getElementById('pdf-iframe');
  modal.classList.add('hidden');
  pdfIframe.src = '';
}

// ============================================
// Plyr Initialization
// ============================================

let plyrInstances = [];

function initializePlyrPlayers(sectionKey) {
  // Initialize video players
  const sectionBody = document.querySelector(`[data-section-key="${sectionKey}"]`);
  if (!sectionBody) return;
  
  const videoElements = sectionBody.querySelectorAll('.plyr-video:not([data-plyr-initialized])');
  videoElements.forEach(video => {
    // Mark as initialized
    video.setAttribute('data-plyr-initialized', 'true');
    
    const player = new Plyr(video, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
      settings: ['speed'],
      speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] },
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
      ratio: '16:9',
    });
    
    plyrInstances.push(player);
  });
  
  // Initialize audio players in file list
  const audioElements = sectionBody.querySelectorAll('audio.plyr-audio:not([data-plyr-initialized])');
  audioElements.forEach(audio => {
    // Mark as initialized
    audio.setAttribute('data-plyr-initialized', 'true');
    
    const player = new Plyr(audio, {
      controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
      keyboard: { focused: true, global: false },
      tooltips: { controls: true, seek: true },
    });
    
    plyrInstances.push(player);
  });
}

// ============================================
// Audio Player (Sticky with Plyr)
// ============================================

let currentAudioFile = null;
let currentAudioList = [];
let currentAudioIndex = -1;
let currentSectionKey = '';
let stickyAudioPlayer = null;

function playAudioFromData(fileDataEncoded, sectionKey) {
  try {
    const file = JSON.parse(decodeURIComponent(fileDataEncoded));
    playAudio(file, sectionKey);
  } catch (error) {
    console.error('Error playing audio:', error);
  }
}

function playAudio(file, sectionKey) {
  // دریافت لیست فایل‌های صوتی این بخش
  const sectionBody = document.querySelector(`[data-section-key="${sectionKey}"]`);
  const filesList = sectionBody.querySelector('.files-list');
  const allFiles = JSON.parse(filesList.dataset.originalFiles);
  const audioFiles = allFiles.filter(f => isAudioFile(f.ext));

  if (audioFiles.length === 0) return;

  currentAudioList = audioFiles;
  currentAudioIndex = audioFiles.findIndex(f => f.name === file.name);
  currentSectionKey = sectionKey;

  if (currentAudioIndex === -1) {
    currentAudioIndex = 0;
  }

  loadAudio(audioFiles[currentAudioIndex]);
}

function loadAudio(file) {
  currentAudioFile = file;
  const playerContainer = document.getElementById('audio-player');
  const audioFilename = document.getElementById('audio-filename');
  
  // Remove old player if exists
  const oldAudio = document.getElementById('sticky-audio-element');
  if (oldAudio && stickyAudioPlayer) {
    stickyAudioPlayer.destroy();
    oldAudio.remove();
  }

  // Create new audio element
  const audioElement = document.createElement('audio');
  audioElement.id = 'sticky-audio-element';
  audioElement.src = file.url;
  audioElement.preload = 'metadata';
  
  const audioSeek = document.querySelector('.audio-seek');
  audioSeek.innerHTML = '';
  audioSeek.appendChild(audioElement);

  audioFilename.textContent = file.name;
  playerContainer.classList.remove('hidden');

  // Initialize Plyr
  stickyAudioPlayer = new Plyr(audioElement, {
    controls: ['play', 'progress', 'current-time', 'mute', 'volume'],
    keyboard: { focused: true, global: true },
    tooltips: { controls: true, seek: true },
  });

  // Event handlers
  document.getElementById('audio-prev').onclick = () => {
    if (currentAudioIndex > 0) {
      currentAudioIndex--;
      loadAudio(currentAudioList[currentAudioIndex]);
    }
  };

  document.getElementById('audio-next').onclick = () => {
    if (currentAudioIndex < currentAudioList.length - 1) {
      currentAudioIndex++;
      loadAudio(currentAudioList[currentAudioIndex]);
    }
  };

  document.getElementById('audio-close').onclick = () => {
    if (stickyAudioPlayer) {
      stickyAudioPlayer.pause();
      stickyAudioPlayer.destroy();
      stickyAudioPlayer = null;
    }
    playerContainer.classList.add('hidden');
    currentAudioFile = null;
    currentAudioList = [];
    currentAudioIndex = -1;
  };
}

// ============================================
// Initialization
// ============================================

function init() {
  // Book selector
  const selector = document.getElementById('book-selector');
  selector.onchange = (e) => {
    const bookNumber = parseInt(e.target.value, 10);
    if (bookNumber >= 1 && bookNumber <= BOOK_COUNT) {
      renderBook(bookNumber);
    } else {
      renderHome();
    }
  };

  // Back button
  document.getElementById('back-home-btn').onclick = renderHome;

  // بررسی URL
  const urlParams = new URLSearchParams(window.location.search);
  const bookParam = urlParams.get('book');

  if (bookParam) {
    const bookNumber = parseInt(bookParam, 10);
    if (bookNumber >= 1 && bookNumber <= BOOK_COUNT) {
      renderBook(bookNumber);
      return;
    }
  }

  renderHome();
}

// اجرا هنگام load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

