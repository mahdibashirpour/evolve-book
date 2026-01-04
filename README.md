# Evolve Books - وب‌سایت دسترسی به فایل‌های مجموعه Evolve

یک وب‌سایت خام و ساده (Vanilla JavaScript) با UI/UX مدرن برای دسترسی آسان دانش‌آموزان به فایل‌های مجموعه Evolve (جلد 1 تا 6) شامل PDF، فایل‌های صوتی و ویدیویی.

## ✨ ویژگی‌ها

- ✅ **صفحه Overview برای هر کتاب**: نمایش کاور و 4 PDF اصلی (کتاب دانش‌آموز، معلم، ویدیو، کار) با کارت‌های بزرگ
- ✅ **بخش‌های منظم**: Audio، Workbook Audio، Video، Documentary با accordion
- ✅ **جستجو و مرتب‌سازی**: جستجوی لحظه‌ای و مرتب‌سازی A-Z / Z-A
- ✅ **Preview عالی**:
  - PDF در Modal تمام‌صفحه با iframe
  - MP3 در Sticky Player پایین صفحه با کنترل‌های کامل
  - MP4/WebM با video player inline
- ✅ **Cache هوشمند**: localStorage با TTL 24 ساعت
- ✅ **UI/UX مدرن**: طراحی تمیز، رنگ‌بندی ملایم، responsive کامل
- ✅ **RTL کامل**: پشتیبانی کامل از راست‌چین و فونت فارسی (Vazirmatn)
- ✅ **بدون نیاز به Build**: فقط 4 فایل HTML/CSS/JS

## 📁 فایل‌های پروژه

- `index.html` - ساختار HTML
- `style.css` - استایل‌های CSS
- `app.js` - منطق JavaScript
- `README.md` - این فایل

## 🚀 اجرای لوکال

### روش 1: Live Server (توصیه می‌شود)

**VS Code:**
1. Extension "Live Server" را نصب کنید
2. روی `index.html` راست‌کلیک کنید
3. "Open with Live Server" را انتخاب کنید

**یا با Python:**
```bash
# Python 3
python -m http.server 8000

# سپس به http://localhost:8000 بروید
```

**یا با Node.js (http-server):**
```bash
npx http-server -p 8000
```

### روش 2: باز کردن مستقیم

⚠️ **توجه**: به دلیل CORS، ممکن است fetch فایل‌ها کار نکند. بهتر است از Live Server استفاده کنید.

## 📦 Deploy روی GitHub Pages

### مرحله 1: آپلود به GitHub

1. یک Repository جدید در GitHub بسازید
2. فایل‌های پروژه را push کنید:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### مرحله 2: فعال‌سازی GitHub Pages

1. به Repository خود بروید
2. **Settings** > **Pages** را باز کنید
3. در بخش **Source**:
   - **Branch**: `main` (یا `master`)
   - **Folder**: `/ (root)`
4. **Save** کنید
5. بعد از چند دقیقه، سایت شما در آدرس زیر در دسترس خواهد بود:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/
   ```

### مرحله 3: تنظیم Custom Domain (اختیاری)

اگر دامنه اختصاصی دارید:
1. در Settings > Pages، بخش Custom domain را پر کنید
2. DNS records را طبق راهنمای GitHub تنظیم کنید

## 📖 نحوه کار

### ساختار داده‌ها

برای هر کتاب، فایل‌های `files.txt` از مسیرهای زیر خوانده می‌شوند:

- **Root**: `${BASE}/files.txt` (فایل‌های اصلی شامل کاور و PDFها)
- **Audio**: `${BASE}/Audio/files.txt`
- **Workbook Audio**: `${BASE}/Workbook%20Audio/files.txt`
- **Video**: `${BASE}/Video/files.txt`
- **Documentary**: `${BASE}/Video/Documentary/files.txt`

### Parser فایل‌ها

Parser به دو صورت کار می‌کند:

1. **خط‌به‌خط**: اگر فایل شامل newline باشد، هر خط non-empty به عنوان یک فایل در نظر گرفته می‌شود.
2. **Regex**: اگر فایل تک‌خطی باشد، با استفاده از Regex فایل‌ها استخراج می‌شوند (بر اساس پسوند).

### Cache

نتایج هر `files.txt` در `localStorage` با TTL 24 ساعت ذخیره می‌شود.

**کلید cache**: `evolve_{bookNumber}_{sectionKey}`

**پاک کردن cache:**
- Developer Tools (F12) > Application > Local Storage
- کلیدهای `evolve_*` را حذف کنید

### فایل‌های اصلی (Overview)

در صفحه هر کتاب، این فایل‌ها به صورت خودکار شناسایی و نمایش داده می‌شوند:

- `cover.jpg` - کاور کتاب
- `Student's Book.pdf` - کتاب دانش‌آموز
- `Teacher's Edition.pdf` - کتاب معلم
- `Video Resource Book.pdf` - کتاب ویدیو
- `Workbook.pdf` - کتاب کار

**نکته**: Parser انعطاف‌پذیر است و فاصله‌ها و apostrophe‌ها را normalize می‌کند.

## 🔧 اضافه کردن کتاب جدید

در فایل `app.js`:

1. مقدار `BOOK_COUNT` را افزایش دهید:
```javascript
const BOOK_COUNT = 7;  // برای Evolve 7
```

2. در `index.html`، یک option جدید به selector اضافه کنید:
```html
<option value="7">Evolve 7</option>
```

تابع `getBookConfig` به صورت خودکار کتاب جدید را پشتیبانی می‌کند.

## ➕ اضافه کردن بخش جدید

در تابع `getBookConfig` در `app.js`:

1. یک بخش جدید به آرایه `sections` اضافه کنید:
```javascript
{
  key: 'newSection',
  titleFa: 'عنوان فارسی',
  icon: '🎯',
  filesTxtUrl: `${base}NewSection/files.txt`,
  basePathUrl: `${base}NewSection/`,
}
```

2. بخش به صورت خودکار در صفحه کتاب نمایش داده می‌شود.

## 🎨 سفارشی‌سازی UI

### تغییر رنگ‌ها

در فایل `style.css`، متغیرهای CSS را تغییر دهید:

```css
:root {
  --primary: #3b82f6;      /* رنگ اصلی */
  --secondary: #10b981;    /* رنگ موفقیت */
  --danger: #ef4444;       /* رنگ خطا */
  /* ... */
}
```

### تغییر فونت

در `index.html`، لینک فونت را تغییر دهید یا در `style.css` فونت جدید اضافه کنید.

## 🐛 عیب‌یابی

### فایل‌ها لود نمی‌شوند

1. **Console مرورگر را بررسی کنید** (F12)
2. **Network tab را چک کنید** که آیا درخواست‌ها ارسال می‌شوند
3. **CORS**: مطمئن شوید که سرور CORS را پشتیبانی می‌کند
4. **Cache را پاک کنید** و دوباره امتحان کنید

### PDF در Modal نمایش داده نمی‌شود

برخی مرورگرها ممکن است PDF را در iframe نمایش ندهند. در این صورت:
- دکمه "باز کردن در تب جدید" را استفاده کنید
- یا دکمه "دانلود" را بزنید

### Audio Player کار نمی‌کند

- مطمئن شوید که فایل‌های صوتی از CORS پشتیبانی می‌کنند
- Console را برای خطاها بررسی کنید
- فرمت فایل را بررسی کنید (mp3, wav, m4a)

### Cache قدیمی

برای پاک کردن cache:
- Developer Tools > Application > Local Storage
- کلیدهای `evolve_*` را حذف کنید
- صفحه را refresh کنید

## 📱 Browser Support

- ✅ Chrome/Edge (آخرین نسخه)
- ✅ Firefox (آخرین نسخه)
- ✅ Safari (آخرین نسخه)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ❌ IE11 (پشتیبانی نمی‌شود)

## 🔒 امنیت

- تمام URLها با `encodeURIComponent` encode می‌شوند
- هیچ داده حساسی در localStorage ذخیره نمی‌شود
- تمام لینک‌های خارجی با `target="_blank"` و `rel="noopener noreferrer"` باز می‌شوند

## 📄 مجوز

این پروژه برای استفاده آموزشی ساخته شده است.

## 🤝 پشتیبانی

اگر مشکلی پیش آمد:

1. **Console مرورگر را بررسی کنید** (F12)
2. **Network requests را چک کنید**
3. **Cache را پاک کنید** و دوباره امتحان کنید
4. **مطمئن شوید که از Live Server استفاده می‌کنید** (نه باز کردن مستقیم فایل)

## 🎯 ویژگی‌های آینده (پیشنهادات)

- [ ] Dark mode
- [ ] فیلتر بر اساس نوع فایل
- [ ] دانلود همه فایل‌های یک بخش
- [ ] Bookmark کردن فایل‌های مورد علاقه
- [ ] تاریخچه مشاهده شده‌ها

---

**ساخته شده با ❤️ برای دانش‌آموزان**

