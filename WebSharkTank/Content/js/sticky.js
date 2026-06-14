(function () {
  const bar = document.querySelector('[data-sticky]');
  const topbar = document.getElementById('header-top');
  const header = document.getElementById('header');
  if (!bar || !header) return;

  // Tính chiều cao để set padding-top cho body khi fixed
  function setOffsets() {
    const h = (topbar?.offsetHeight || 0) + (header?.offsetHeight || 0);
    document.documentElement.style.setProperty('--navbar-height', h + 'px');
  }
  window.addEventListener('load', setOffsets);
  window.addEventListener('resize', setOffsets);

  let lastY = window.pageYOffset;
  let ticking = false;

  // Dùng IntersectionObserver để biết khi nào vượt qua navbar (ổn định hơn)
  let passed = false;
  const sentinel = document.createElement('div');
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.position = 'absolute';
  sentinel.style.top = 0;
  sentinel.style.left = 0;
  sentinel.style.right = 0;
  sentinel.style.height = (bar.offsetHeight || 1) + 'px';
  bar.parentNode.insertBefore(sentinel, bar);

  new IntersectionObserver(
    (entries) => {
      // Nếu sentinel KHÔNG còn thấy -> đã vượt qua vị trí ban đầu
      passed = !entries[0].isIntersecting;
      toggleSticky(passed);
    },
    { rootMargin: '0px 0px 0px 0px', threshold: 0 }
  ).observe(sentinel);

  function toggleSticky(shouldStick) {
    if (shouldStick) {
      if (!bar.classList.contains('is-sticky')) {
        bar.classList.add('is-sticky');
        document.body.classList.add('has-sticky-offset');
      }
    } else {
      bar.classList.remove('is-sticky', 'is-hidden');
      document.body.classList.remove('has-sticky-offset');
    }
  }

  const deltaHide = 8;
  const deltaShow = 8;
  const revealAfter = 120;

  function onScroll() {
    const y = window.pageYOffset;

    if (passed) {
      // chỉ auto ẩn/hiện khi đã qua một đoạn tương đối
      if (y > revealAfter) {
        if (y - lastY > deltaHide) {
          // cuộn xuống -> ẩn
          bar.classList.add('is-hidden');
        } else if (lastY - y > deltaShow) {
          // cuộn lên -> hiện
          bar.classList.remove('is-hidden');
        }
      } else {
        bar.classList.remove('is-hidden');
      }
    }

    lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();
(function () {
  const isGH = location.hostname.endsWith('github.io');
  const repo = isGH ? location.pathname.split('/')[1] : '';
  const BASE = isGH && repo ? `/${repo}/` : '/';

  // Chuẩn hoá đường dẫn
  function absolutize(el, attr) {
    const val = el.getAttribute(attr);
    if (!val) return;
    // Bỏ qua link tuyệt đối, anchor, tel, mailto
    if (/^(https?:)?\/\//.test(val) || val.startsWith('mailto:') || val.startsWith('tel:') || val.startsWith('#')) return;

    const cleaned = val.replace(/^\.\//, ''); // bỏ "./"
    el.setAttribute(attr, BASE + cleaned.replace(/^\//, ''));
  }

  function applyBase() {
    // <a data-href="...">
    document.querySelectorAll('a[data-href]').forEach(a => {
      a.setAttribute('href', a.getAttribute('data-href'));
      absolutize(a, 'href');
    });

    // <img data-src="...">
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.setAttribute('src', img.getAttribute('data-src'));
      absolutize(img, 'src');
    });

    // <link data-href="..."> (CSS)
    document.querySelectorAll('link[data-href]').forEach(link => {
      link.setAttribute('href', link.getAttribute('data-href'));
      absolutize(link, 'href');
    });

    // <script data-src="..."> (JS)
    document.querySelectorAll('script[data-src]').forEach(s => {
      s.setAttribute('src', s.getAttribute('data-src'));
      absolutize(s, 'src');
    });
  }

  document.addEventListener('DOMContentLoaded', applyBase);
})();

(function () {
  const ads = document.querySelectorAll('.side-ad');
  const footer = document.getElementById('footer');
  if (!ads.length || !footer) return;

  const SAFE = parseInt(getComputedStyle(document.documentElement)
    .getPropertyValue('--ad-safe-gap') || '16', 10);

  let ticking = false;
  function clampToFooter() {
    const overlap = Math.ceil(window.innerHeight - footer.getBoundingClientRect().top);
    ads.forEach(ad => {
      if (overlap > 0) {
        ad.classList.add('side-ad--clamped');
        ad.style.bottom = (overlap + SAFE) + 'px';
        ad.style.top = 'auto';
      } else {
        ad.classList.remove('side-ad--clamped');
        ad.style.bottom = '';
        ad.style.top = '';
      }
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { clampToFooter(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  clampToFooter();
})();