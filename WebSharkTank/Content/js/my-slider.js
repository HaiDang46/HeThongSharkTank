// Chỉ khởi tạo Slidezy nếu container tồn tại
let mySlider = null;
const mySliderContainer = document.querySelector("#my-slider");
if (mySliderContainer && window.Slidezy) {
  mySlider = new Slidezy("#my-slider", {
    items: 1,
    loop: true,
    autoplayTimeout: 3000,
    nav: false,
    autoplay: true
  });
}

function initMySlider(selector, opts) {
  const container = document.querySelector(selector);
  if (!container) {
    console.debug(`[my-slider] Container "${selector}" not found, skipping initialization`);
    return null;
  }
  
  const isMobile = window.innerWidth <= 768;
  const defaults = {
    items: isMobile ? 2 : 5,
    loop: false,
    autoplay: false,
    nav: false
  };
  const options = Object.assign({}, defaults, opts || {});
  if (!window.Slidezy) {
    console.error('Slidezy not loaded');
    return null;
  }
  return new Slidezy(selector, options);
}

