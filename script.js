    // Dot connector, scroll-driven and fully reversible
    const dotConnectors = [...document.querySelectorAll('.dot-connector')];

    function updateDots() {
      if (!dotConnectors.length) return;
      const vh = window.innerHeight;

      dotConnectors.forEach((dotConnector) => {
        const dots = [...dotConnector.querySelectorAll('.dot-connector__dot')];
        if (!dots.length) return;

        const rect = dotConnector.getBoundingClientRect();

        // progress: 0 when connector top hits viewport bottom, 1 when connector bottom hits viewport top
        const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));

        dots.forEach((dot, i) => {
          // Each dot reveals at an evenly-spaced threshold of scroll progress
          const threshold = i / (dots.length - 1);
          // Reveal window: starts at threshold, fully in 0.12 later
          const t = Math.min(1, Math.max(0, (progress - threshold) / 0.12));
          dot.style.opacity = t;
          dot.style.transform = `scale(${0.3 + 0.7 * t})`;
        });
      });
    }

    const reveals = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.14,
      rootMargin: '0px 0px -40px 0px'
    });

    reveals.forEach((el) => revealObserver.observe(el));

    const nav = document.getElementById('nav');
    const navInner = nav.querySelector('.nav-inner');
    const navToggle = document.getElementById('navToggle');
    const mobileMenu = document.getElementById('mobileMenu');

    // Nav: bubble + shrink as one continuous motion on desktop
    const NAV_BUBBLE_START = 40;
    const NAV_SHRINK_DIST  = 360;
    const NAV_WIDTH_MIN    = 0.52; // fallback floor if content-fit width is smaller than expected
    const NAV_SHRINK_BREAKPOINT = 980;

    function syncNavState() {
      nav.classList.toggle('nav-open', navToggle.classList.contains('active'));
    }

    function getDesktopNavWidths() {
      const visibleChildren = [...navInner.children].filter((child) => child.offsetParent !== null);
      const innerStyles = window.getComputedStyle(navInner);
      const gap = parseFloat(innerStyles.gap) || 24;
      const padding = parseFloat(innerStyles.paddingLeft) + parseFloat(innerStyles.paddingRight);
      const contentWidth = visibleChildren.reduce((sum, child) => sum + child.offsetWidth, 0) + Math.max(0, visibleChildren.length - 1) * gap + padding + 12;
      const maxPx = Math.min(window.innerWidth - 20, 1720);
      const minPx = Math.min(maxPx, Math.max(contentWidth, window.innerWidth * NAV_WIDTH_MIN));
      return { maxPx, minPx };
    }

    function updateNav() {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > NAV_BUBBLE_START);

      if (window.innerWidth <= NAV_SHRINK_BREAKPOINT) {
        navInner.style.width = '';
        return;
      }

      const { maxPx, minPx } = getDesktopNavWidths();
      const t = Math.min(1, Math.max(0, (y - NAV_BUBBLE_START) / NAV_SHRINK_DIST));
      const width = maxPx - (maxPx - minPx) * t;
      navInner.style.width = `${width.toFixed(1)}px`;
    }

    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });

    syncNavState();

    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      syncNavState();
    });

    mobileMenu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        mobileMenu.classList.remove('open');
        syncNavState();
      });
    });

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        const href = anchor.getAttribute('href');
        const target = href === '#pricingApply'
          ? document.querySelector('.pricing-card')
          : document.querySelector(href);
        if (target) {
          event.preventDefault();
          target.scrollIntoView({
            behavior: 'smooth',
            block: href === '#pricingApply' ? 'center' : 'start'
          });
        }
      });
    });

    // Booking popup
    const bookingOverlay = document.getElementById('bookingOverlay');
    const bookingClose = document.getElementById('bookingClose');
    const bookingTriggers = document.querySelectorAll('.apply-trigger');
    let bookingCloseTimer;

    function openBooking() {
      if (!bookingOverlay) return;
      clearTimeout(bookingCloseTimer);
      bookingOverlay.classList.remove('is-closing');
      bookingOverlay.classList.add('is-open');
      document.body.classList.add('booking-modal-active');
      document.body.style.overflow = 'hidden';
    }

    function closeBooking() {
      if (!bookingOverlay || !bookingOverlay.classList.contains('is-open')) return;
      bookingOverlay.classList.add('is-closing');
      document.body.classList.remove('booking-modal-active');

      bookingCloseTimer = setTimeout(() => {
        bookingOverlay.classList.remove('is-open');
        bookingOverlay.classList.remove('is-closing');
        document.body.style.overflow = '';
      }, 360);
    }

    bookingTriggers.forEach((trigger) => {
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        openBooking();
      });
    });

    if (bookingClose) bookingClose.addEventListener('click', closeBooking);
    if (bookingOverlay) bookingOverlay.addEventListener('click', (event) => {
      if (event.target === bookingOverlay) closeBooking();
    });

    // Expanding final CTA panel
    const expandingPanel = document.getElementById('expandingPanel');
    const heroDepthLayer = document.querySelector('.hero-depth-layer');

    // Scroll-scale: The Shift (.problem-stage) and The Process (.protocol section)
    // Behaviour:
    //   - 0.5 when element first enters at viewport bottom
    //   - grows to 1.0 once top edge reaches about 18% down the viewport
    //   - holds 1.0 through the dwell zone
    //   - shrinks back to 0.5 once bottom edge crosses 30% from viewport top (exit late)
    const scaleTargets = [
      { el: document.querySelector('.problem-stage'), min: 0.84, offset: 420 },
      { el: document.querySelector('.reframe-content'), min: 0.94, offset: 30 },
      { el: document.querySelector('.founder .container'), min: 0.94, offset: 30 },
      { el: document.querySelector('.proof-grid'), min: 0.85 },
      { el: document.querySelector('.pricing-card'), min: 0.85 },
      { el: document.querySelector('.comparison-board'), min: 0.9 },
      { el: document.querySelector('.expanding-panel-wrap') },
    ].filter(t => t.el);

    const SCALE_MIN = 0.5;
    const SCALE_MAX = 1.0;
    const SCALE_DISABLE_BREAKPOINT = 720;

    // easeInOut for smooth ramp
    function ease(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function getScale(el, offset = 0, scaleMin = SCALE_MIN) {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;

      const entryStart = vh        + offset;
      const entryEnd   = vh * 0.18 + offset;
      const exitStart  = vh * 0.30 + offset;
      const exitEnd    = -rect.height * 0.1 + offset;

      let progress;

      if (rect.top > entryEnd) {
        const t = 1 - Math.min(1, Math.max(0, (rect.top - entryEnd) / (entryStart - entryEnd)));
        progress = ease(t);
      } else if (rect.bottom < exitStart) {
        const t = Math.min(1, Math.max(0, (rect.bottom - exitEnd) / (exitStart - exitEnd)));
        progress = ease(t);
      } else {
        progress = 1;
      }

      return scaleMin + (SCALE_MAX - scaleMin) * progress;
    }

    let rafPending = false;

    function updateScene() {
      // Expanding final CTA panel
      if (expandingPanel) {
        const rect = expandingPanel.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const start = viewportHeight * 0.92;
        const end = viewportHeight * 0.2;
        const progress = Math.min(1, Math.max(0, (start - rect.top) / (start - end)));
        const startWidth = Math.min(window.innerWidth - 72, 1240);
        const endWidth = window.innerWidth;
        const radius = Math.max(0, 38 - (38 * progress));

        if (progress > 0.985) {
          expandingPanel.classList.add('is-expanded');
          expandingPanel.style.width = '100%';
          expandingPanel.style.borderRadius = '0';
        } else {
          expandingPanel.classList.remove('is-expanded');
          expandingPanel.style.width = `${startWidth + ((endWidth - startWidth) * progress)}px`;
          expandingPanel.style.borderRadius = `${radius}px ${radius}px 0 0`;
        }
      }

      // Scroll-scale
      scaleTargets.forEach(({ el, offset = 0, min }) => {
        if (window.innerWidth <= SCALE_DISABLE_BREAKPOINT) {
          el.style.transform = 'none';
          return;
        }

        el.style.transform = `scale(${getScale(el, offset, min).toFixed(4)})`;
      });

      if (heroDepthLayer) {
        // Counter-scroll against the page so this layer clearly lags behind
        // the rest of the content instead of moving at the same visual speed.
        const parallaxShift = Math.min(window.scrollY * 0.24, 180);
        const translateY = 14 + parallaxShift;
        const scale = 1.004 + Math.min(window.scrollY * 0.000015, 0.012);
        heroDepthLayer.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      }

      // Dot connector
      updateDots();

      rafPending = false;
    }

    function onScroll() {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(updateScene);
      }
    }

    updateScene();
    updateDots();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 980) {
        navToggle.classList.remove('active');
        mobileMenu.classList.remove('open');
        syncNavState();
      }
      updateNav();
      updateScene();
    });

    // (architecture section removed)

    const archLevelData = {
      1: {
        marker: '01',
        title: 'KNOW',
        subtitle: 'The place where the old story gets interrupted.',
        image: 'assets/extra asset 1.png',
        imageAlt: 'A lone Builder seated on a circular platform at the threshold of a vast world',
        scene: 'You enter with the version of yourself you usually present. Then the work gets quieter and more exact: stories, patterns, instincts, and the part of your value that was hard to name before.',
        notes: ['Baseline identity', 'Story excavation', 'Naming ceremony']
      },
      2: {
        marker: '02',
        title: 'SHOW',
        subtitle: 'The place where private clarity becomes visible signal.',
        image: 'assets/extra asset 4.png',
        imageAlt: 'A vast garden pathway representing signal moving outward',
        scene: 'Your ideas leave the room. You learn what earns the right attention, what sounds like you, and what starts conversations with people who should know your work.',
        notes: ['Writing taste', 'Attention mechanics', 'Traction through interaction']
      },
      3: {
        marker: '03',
        title: 'BUILD',
        subtitle: 'The place where evidence turns into leverage.',
        image: 'assets/extra asset 6.png',
        imageAlt: 'A laptop on a worktable inside a monumental Builder workspace',
        scene: 'The work becomes more practical. You read what resonated, refine the signal, and build one useful AI-supported workflow around an actual bottleneck in your work.',
        notes: ['Resonance review', 'AI as amplifier', 'First leverage workflow']
      },
      4: {
        marker: '04',
        title: 'TRIBE',
        subtitle: 'The place where the room becomes part of the asset.',
        image: 'assets/extra asset 2.png',
        imageAlt: 'A group gathered under a glowing canopy of light',
        scene: 'By the end, the room has seen your before, your work, your proof, and your shift. That is what makes the network feel earned instead of assigned.',
        notes: ['Peer witnessing', 'Business relevance', 'Builderz World continuation']
      }
    };

    const archOverlay = document.getElementById('archOverlay');
    const archModal = document.getElementById('archModal');
    const archClose = document.getElementById('archClose');
    const archPrev = document.getElementById('archPrev');
    const archNext = document.getElementById('archNext');
    const modalWeeks = document.getElementById('modalWeeks');
    const modalTitle = document.getElementById('modalTitle');
    const modalSubtitle = document.getElementById('modalSubtitle');
    const modalImage = document.getElementById('modalImage');
    const modalComponents = document.getElementById('modalComponents');
    const archTimeline = document.getElementById('archTimeline');
    let activeArchLevel = 1;

    // Phase week ranges: [startWeek, endWeek]
    // Phase week ranges and labels
    const phases = [
      { id: 1, label: 'KNOW', weeks: [1, 2] },
      { id: 2, label: 'SHOW', weeks: [3, 4] },
      { id: 3, label: 'BUILD', weeks: [5, 6] },
      { id: 4, label: 'TRIBE', weeks: null } // ongoing
    ];
    const totalWeeks = 8;

    function buildTimeline(level) {
      const isOngoing = (level === 4);

      // Phase label row
      let html = '<div class="arch-timeline__phases">';
      phases.forEach(function(p) {
        let cls = 'arch-timeline__phase';
        if (p.id === level) cls += ' is-active';
        else if (p.id < level) cls += ' is-past';

        if (p.weeks) {
          const span = p.weeks[1] - p.weeks[0] + 1;
          const flex = span / totalWeeks;
          html += '<div class="' + cls + '" style="flex:' + flex + '">';
          html += '<span class="arch-timeline__phase-label">' + p.label + '</span>';
          html += '<span class="arch-timeline__phase-weeks">W' + p.weeks[0] + '-' + p.weeks[1] + '</span>';
          html += '</div>';
        }
      });
      if (isOngoing) {
        html += '<div class="arch-timeline__phase is-active is-ongoing">';
        html += '<span class="arch-timeline__phase-label">TRIBE</span>';
        html += '<span class="arch-timeline__phase-weeks">Ongoing</span>';
        html += '</div>';
      }
      html += '</div>';

      // Segment bar
      html += '<div class="arch-timeline__bar">';
      for (var w = 1; w <= totalWeeks; w++) {
        var cls = 'arch-timeline__seg';
        if (!isOngoing) {
          var range = phases[level - 1].weeks;
          if (range && w >= range[0] && w <= range[1]) cls += ' is-active';
          else if (range && w < range[0]) cls += ' is-past';
        } else {
          cls += ' is-past';
        }
        html += '<div class="' + cls + '"></div>';
      }
      if (isOngoing) {
        html += '<div class="arch-timeline__seg is-active is-ongoing-seg"></div>';
      }
      html += '</div>';

      archTimeline.innerHTML = html;
    }

    function openArchModal(level) {
      level = parseInt(level, 10);
      const data = archLevelData[level];
      if (!data) return;

      activeArchLevel = level;
      archOverlay.classList.remove('is-closing');
      archTimeline.innerHTML = '';
      modalWeeks.textContent = data.marker;
      modalTitle.textContent = data.title;
      modalSubtitle.textContent = data.subtitle;
      modalImage.src = data.image;
      modalImage.alt = data.imageAlt;
      if (archPrev) archPrev.disabled = level === 1;
      if (archNext) archNext.disabled = level === 4;

      const notesHtml = data.notes.map(note =>
        `<li>${note}</li>`
      ).join('');

      modalComponents.innerHTML = `
        <section class="arch-immersive-copy">
          <p>${data.scene}</p>
          <ul>${notesHtml}</ul>
        </section>
      `;

      archOverlay.classList.add('is-open');
      document.body.classList.add('arch-modal-active');
      document.body.style.overflow = 'hidden';
    }

    function showAdjacentArchModal(direction) {
      const nextLevel = activeArchLevel + direction;
      if (nextLevel < 1 || nextLevel > 4) return;
      openArchModal(nextLevel);
    }

    function closeArchModal() {
      archOverlay.classList.add('is-closing');
      document.body.classList.remove('arch-modal-active');

      setTimeout(function() {
        archOverlay.classList.remove('is-open');
        archOverlay.classList.remove('is-closing');
        document.body.style.overflow = '';
      }, 450);
    }

    document.querySelectorAll('.arch-dot').forEach(btn => {
      btn.addEventListener('click', () => {
        openArchModal(btn.dataset.level);
      });
    });

    if (archClose) archClose.addEventListener('click', closeArchModal);
    if (archPrev) archPrev.addEventListener('click', () => showAdjacentArchModal(-1));
    if (archNext) archNext.addEventListener('click', () => showAdjacentArchModal(1));
    if (archOverlay) archOverlay.addEventListener('click', (e) => {
      if (e.target === archOverlay) closeArchModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bookingOverlay && bookingOverlay.classList.contains('is-open')) {
        closeBooking();
      }
    });

    // Early-bird countdown timer, counts down to May 15 2026 midnight CET
    (function () {
      const deadline = new Date('2026-05-15T00:00:00+02:00').getTime();
      const timerEl = document.getElementById('pricingTimer');
      const daysEl = document.getElementById('timerDays');
      const hoursEl = document.getElementById('timerHours');
      const minsEl = document.getElementById('timerMins');
      const secsEl = document.getElementById('timerSecs');
      if (!timerEl) return;

      function pad(n) { return String(n).padStart(2, '0'); }

      function tick() {
        const now = Date.now();
        const diff = deadline - now;
        if (diff <= 0) {
          timerEl.classList.add('pricing-timer--expired');
          const amount = document.querySelector('.pricing-amount');
          const full = document.querySelector('.pricing-amount-full');
          if (amount) amount.textContent = '€4,997';
          if (full) full.style.display = 'none';
          return;
        }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        daysEl.textContent = pad(d);
        hoursEl.textContent = pad(h);
        minsEl.textContent = pad(m);
        secsEl.textContent = pad(s);
      }

      tick();
      setInterval(tick, 1000);
    })();

    // Process section: week navigator + one smooth detail drawer
    const processBoard = document.querySelector('.process-board');
    if (processBoard) {
      const processControls = [...processBoard.querySelectorAll('[data-process-target]')];
      const processImages = [...processBoard.querySelectorAll('[data-process-image]')];
      const processCopies = [...processBoard.querySelectorAll('[data-process-copy]')];

      function setProcessPhase(phase) {
        processControls.forEach((control) => {
          const active = control.dataset.processTarget === phase;
          control.classList.toggle('is-active', active);
          control.setAttribute('aria-selected', String(active));
        });
        processImages.forEach((image) => image.classList.toggle('is-active', image.dataset.processImage === phase));
        processCopies.forEach((copy) => copy.classList.toggle('is-active', copy.dataset.processCopy === phase));
      }

      processControls.forEach((control) => {
        control.addEventListener('click', () => {
          setProcessPhase(control.dataset.processTarget);
          control.classList.remove('is-pulsing');
          void control.offsetWidth;
          control.classList.add('is-pulsing');
        });
        control.addEventListener('animationend', (event) => {
          if (event.animationName === 'processWeekPulse') {
            control.classList.remove('is-pulsing');
          }
        });
      });
    }
