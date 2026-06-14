// Kiểm tra xem mq1 đã được khai báo chưa để tránh lỗi khi load nhiều lần
if (typeof window.footerMq1 === 'undefined') {
    window.footerMq1 = window.matchMedia('(max-width: 575px)'); // khớp screen(sm)
}
const mq1 = window.footerMq1;

function setupAccordion() {
  const cols = document.querySelectorAll('.footer__col');
  cols.forEach((col, idx) => {
    const heading = col.querySelector('.footer__heading');
    const panel = heading?.nextElementSibling;
    if (!heading || !panel) return;

    if (mq1.matches) {
      if (!heading.querySelector('.footer__toggle')) {
        const titleText = heading.textContent.trim();
        heading.textContent = '';
        const btn = document.createElement('button');
        btn.className = 'footer__toggle';
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        const pid = `footer-panel-${idx}`;
        panel.id = panel.id || pid;
        btn.setAttribute('aria-controls', panel.id);

        btn.innerHTML = `
            <span>${titleText}</span>
            <span class="footer__chev">+</span>
          `;
        heading.appendChild(btn);

        panel.classList.add('footer__panel');

        btn.addEventListener('click', () => {
          const isOpen = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!isOpen));
          panel.classList.toggle('is-open', !isOpen);
          btn.querySelector('.footer__chev').textContent = isOpen ? '+' : '–';
        });
      }
    } else {
      const toggle = heading.querySelector('.footer__toggle');
      if (toggle) {
        heading.textContent = toggle.querySelector('span').textContent;
      }
      panel.classList.add('is-open');
    }
  });
}

const mq = window.matchMedia('(min-width: 576px)');
function syncDesktopState() {
  const panels = document.querySelectorAll('.footer__panel');
  const toggles = document.querySelectorAll('.footer__toggle');
  if (mq.matches) {
    panels.forEach(p => p.classList.add('is-open'));
    toggles.forEach(t => t.setAttribute('aria-expanded', 'true'));
  } else {
    panels.forEach(p => p.classList.remove('is-open'));
    toggles.forEach(t => t.setAttribute('aria-expanded', 'false'));
  }
}
syncDesktopState();
mq.addEventListener ? mq.addEventListener('change', syncDesktopState) : mq.addListener(syncDesktopState);

// Gọi setupAccordion lần đầu
setupAccordion();
mq1.addEventListener('change', setupAccordion);
