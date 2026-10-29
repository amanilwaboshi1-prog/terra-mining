(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  const footer = document.querySelector('.site-footer');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.nav-links');
  const menuMedia = window.matchMedia('(max-width: 900px)');
  const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  const parallaxMedia = window.matchMedia('(min-width: 901px) and (pointer: fine)');
  const motionButton = document.querySelector('.motion-toggle');
  const counters = [...document.querySelectorAll('[data-count]')];
  const counterFrames = new Map();
  let manualReduction = false;
  let reduceMotion = reducedMedia.matches;
  let menuOpen = false;
  let revealObserver;
  let counterObserver;

  // Only a display preference is stored. The contact form never stores data.
  try { manualReduction = localStorage.getItem('terra-reduce-motion') === 'true'; } catch (_) { /* Storage may be unavailable in private/file browsing. */ }

  function finishCounter(counter) {
    if (counterFrames.has(counter)) cancelAnimationFrame(counterFrames.get(counter));
    counterFrames.delete(counter);
    counter.textContent = counter.dataset.count.padStart(Number(counter.dataset.pad || 0), '0');
  }

  function applyMotionPreference() {
    reduceMotion = manualReduction || reducedMedia.matches;
    root.classList.toggle('reduce-motion', reduceMotion);
    root.classList.toggle('motion-ready', !reduceMotion && 'IntersectionObserver' in window);
    motionButton.setAttribute('aria-pressed', String(reduceMotion));
    motionButton.disabled = reducedMedia.matches;
    motionButton.querySelector('.motion-label').textContent = reducedMedia.matches
      ? 'Animations réduites (système)'
      : manualReduction ? 'Réactiver les animations' : 'Réduire les animations';
    if (reduceMotion) {
      counters.forEach(finishCounter);
      document.querySelectorAll('[data-reveal]').forEach(element => element.classList.add('is-visible'));
      document.querySelector('.hero-media').style.removeProperty('--parallax');
      document.querySelectorAll('.project-card').forEach(card => card.getAnimations().forEach(animation => animation.cancel()));
    }
  }

  motionButton.hidden = false;
  motionButton.addEventListener('click', () => {
    manualReduction = !manualReduction;
    try { localStorage.setItem('terra-reduce-motion', String(manualReduction)); } catch (_) { /* The current page still respects the choice. */ }
    applyMotionPreference();
  });
  reducedMedia.addEventListener('change', applyMotionPreference);

  // Mobile navigation: reversible disclosure, keyboard access and focus isolation.
  function setMenu(open, restoreFocus = false) {
    menuOpen = open && menuMedia.matches;
    document.body.classList.toggle('menu-open', menuOpen);
    menuButton.setAttribute('aria-expanded', String(menuOpen));
    menuButton.setAttribute('aria-label', menuOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    main.inert = menuOpen;
    footer.inert = menuOpen;
    document.querySelector('.skip-link').inert = menuOpen;
    if (restoreFocus) menuButton.focus();
  }

  menuButton.addEventListener('click', () => setMenu(!menuOpen));
  document.querySelector('.menu-shade').addEventListener('click', () => setMenu(false, true));
  header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  menuMedia.addEventListener('change', () => { if (!menuMedia.matches) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (!menuOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false, true); }
    if (event.key === 'Tab') {
      const focusable = [...header.querySelectorAll('a, button')].filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  root.classList.add('menu-enhanced');

  // Filter the gallery without moving keyboard focus from its controls.
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-category]')];
  const gallery = document.querySelector('.project-grid');
  const filterAnimations = new Map();
  function filterProjects(category) {
    if (!filters.some(button => button.dataset.filter === category)) return;
    filters.forEach(button => {
      const active = button.dataset.filter === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    let visible = 0;
    gallery.classList.toggle('is-filtered', category !== 'all');
    cards.forEach(card => {
      filterAnimations.get(card)?.cancel();
      const show = category === 'all' || card.dataset.category === category;
      card.hidden = !show;
      if (show) {
        card.classList.add('is-visible');
        if (!reduceMotion && card.animate) {
          const animation = card.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], {
            duration: 450, delay: visible * 65, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards'
          });
          filterAnimations.set(card, animation);
        }
        visible++;
      }
    });
    document.querySelector('#filter-status').textContent = `${visible} projet${visible > 1 ? 's' : ''} affiché${visible > 1 ? 's' : ''}.`;
  }
  filters.forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
  document.querySelectorAll('[data-select]').forEach(link => link.addEventListener('click', () => filterProjects(link.dataset.select)));

  // Native dialog provides Escape handling and restores focus to its trigger.
  const projectData = {
    atlas: {
      title: 'Horizon Atlas', category: 'Exploration · Projet conceptuel',
      description: 'Avant d’imaginer une exploitation, il faut comprendre le territoire. Horizon Atlas explore cette première étape : observer, cartographier et confronter les données au terrain.',
      objective: 'Caractériser le potentiel minéral d’une zone d’étude et identifier les incertitudes à approfondir.',
      approach: 'Observations géologiques, échantillonnage, analyse des données et prise en compte du contexte environnemental.'
    },
    cuivre: {
      title: 'Terres de cuivre', category: 'Exploitation · Projet conceptuel',
      description: 'Terres de cuivre imagine une exploitation à ciel ouvert où la planification technique s’articule avec la sécurité des équipes et l’évolution du site dans le temps.',
      objective: 'Concevoir une organisation cohérente des opérations d’extraction, du premier accès à la réhabilitation.',
      approach: 'Planification des phases, organisation des circulations, prévention des risques et suivi des impacts.'
    },
    matiere: {
      title: 'Nouvelle Matière', category: 'Traitement · Projet conceptuel',
      description: 'Chaque minerai possède ses particularités. Nouvelle Matière met en scène le travail d’étude qui permet d’adapter les procédés de préparation et de valorisation à la ressource.',
      objective: 'Étudier une chaîne de traitement adaptée à la matière, à sa composition et à l’usage visé.',
      approach: 'Caractérisation des échantillons, essais de séparation et réflexion sur les consommations d’eau et d’énergie.'
    }
  };
  const dialog = document.querySelector('.project-dialog');
  let backdropPress = false;
  if (typeof dialog.showModal === 'function') {
    document.querySelectorAll('[data-project]').forEach(link => link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const project = projectData[link.dataset.project];
      if (!project) return;
      event.preventDefault();
      ['title', 'category', 'description', 'objective', 'approach'].forEach(key => {
        document.querySelector(`#dialog-${key}`).textContent = project[key];
      });
      const sourceImage = link.querySelector('img');
      const dialogImage = document.querySelector('#dialog-image');
      dialogImage.src = sourceImage.currentSrc || sourceImage.src;
      dialogImage.alt = sourceImage.alt;
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('dialog-open');
    }));
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    const outsideDialog = event => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    dialog.addEventListener('pointerdown', event => { backdropPress = event.target === dialog && outsideDialog(event); });
    dialog.addEventListener('click', event => { if (backdropPress && event.target === dialog && outsideDialog(event)) dialog.close(); });
    dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
    document.querySelector('#dialog-contact').addEventListener('click', () => {
      dialog.close();
      document.querySelector('#contact-title').focus({ preventScroll: true });
    });
  }

  // Honest demo feedback, including whitespace validation.
  const form = document.querySelector('#contact-form');
  form.querySelectorAll('input, textarea').forEach(field => field.addEventListener('input', () => {
    field.setCustomValidity('');
    document.querySelector('#form-status').textContent = '';
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    [form.elements.name, form.elements.message].forEach(field => {
      field.setCustomValidity(field.value.trim() ? '' : 'Veuillez renseigner ce champ.');
    });
    if (!form.reportValidity()) return;
    document.querySelector('#form-status').textContent = 'Votre formulaire est valide. Merci d’avoir testé cette démonstration : aucun message n’a été envoyé et aucune donnée n’a été enregistrée.';
  });
  document.querySelector('#year').textContent = new Date().getFullYear();

  // Reveal each section once. Without JS or observers, all content stays visible.
  if ('IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(element => revealObserver.observe(element));
    counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const counter = entry.target;
        counterObserver.unobserve(counter);
        if (reduceMotion) { finishCounter(counter); return; }
        const target = Number(counter.dataset.count);
        const padding = Number(counter.dataset.pad || 0);
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / 1200, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          counter.textContent = String(Math.round(target * eased)).padStart(padding, '0');
          if (progress < 1 && !reduceMotion) counterFrames.set(counter, requestAnimationFrame(tick));
          else finishCounter(counter);
        }
        counterFrames.set(counter, requestAnimationFrame(tick));
      });
    }, { threshold: .8 });
    counters.forEach(counter => counterObserver.observe(counter));
  }
  applyMotionPreference();

  // Scroll work is limited to one animation frame, and parallax to desktop pointers.
  const hero = document.querySelector('.hero');
  const heroMedia = document.querySelector('.hero-media');
  const progressBar = document.querySelector('.reading-progress');
  const sectionLinks = [...navigation.querySelectorAll('a[href^="#"]')];
  const trackedSections = [...document.querySelectorAll('main > section[id]')];
  let scrollScheduled = false;
  function updateScroll() {
    scrollScheduled = false;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 35);
    const scrollable = root.scrollHeight - window.innerHeight;
    progressBar.style.transform = `scaleX(${scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0})`;
    if (!reduceMotion && parallaxMedia.matches && y < hero.offsetHeight) {
      heroMedia.style.setProperty('--parallax', `${Math.min(y * .13, 55).toFixed(1)}px`);
    } else heroMedia.style.removeProperty('--parallax');
    let current = 'accueil';
    trackedSections.forEach(section => { if (section.getBoundingClientRect().top <= 180) current = section.id; });
    sectionLinks.forEach(link => {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function requestScrollUpdate() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(updateScroll);
  }
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate, { passive: true });
  window.addEventListener('load', requestScrollUpdate, { once: true });
  updateScroll();
})();
