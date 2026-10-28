const sidebar = document.querySelector('.floating-nav');
const toggle = document.querySelector('#nav-toggle');
const backdrop = document.querySelector('#nav-backdrop');
const compact = matchMedia('(max-width: 1199px)');
const links = [...sidebar.querySelectorAll('.section-nav a')];
const sections = links.map(link => document.querySelector(link.hash));
const content = [document.querySelector('main'), document.querySelector('footer')];

function setOpen(open, restoreFocus=false) {
  sidebar.classList.toggle('is-open', open);
  toggle.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !open;
  document.body.classList.toggle('menu-open', open);
  content.forEach(el => { el.inert = open; });
  sidebar.inert = compact.matches && !open;
  if (open) (sidebar.querySelector('[aria-current]') || links[0]).focus();
  else if (restoreFocus) toggle.focus();
}
toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
backdrop.addEventListener('click', () => setOpen(false, true));
sidebar.addEventListener('click', event => { if (compact.matches && event.target.closest('a')) setOpen(false, true); });
document.addEventListener('keydown', event => {
  if (toggle.getAttribute('aria-expanded') !== 'true') return;
  if (event.key === 'Escape') { setOpen(false, true); return; }
  if (event.key !== 'Tab') return;
  const available = [toggle, ...sidebar.querySelectorAll('a, button, select')];
  const first = available[0], last = available.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
compact.addEventListener('change', () => setOpen(false));
setOpen(false);

let pending = false;
function updatePosition() {
  const threshold = innerHeight * .27;
  let active = sections[0];
  for (const section of sections) if (section.getBoundingClientRect().top <= threshold) active = section;
  links.forEach(link => {
    if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  const total = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('.reading-progress').style.width = `${total > 0 ? scrollY / total * 100 : 0}%`;
  pending = false;
}
window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updatePosition); } }, {passive:true});
window.addEventListener('resize', updatePosition);
updatePosition();
