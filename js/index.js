// Scroll-entry reveal animations (.reveal-up / .reveal-pop) - crossfade + scale
// the first time each element enters the viewport.
(function () {
  var targets = document.querySelectorAll('.reveal-up, .reveal-pop');
  if (!targets.length) return;

  if (typeof IntersectionObserver === 'undefined') {
    targets.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  targets.forEach(function (el) { observer.observe(el); });
})();

// Mobile nav drawer toggle
(function () {
  var navToggle = document.getElementById('navToggle');
  var mobilePanel = document.getElementById('mobileNavPanel');
  var iconOpen = document.getElementById('navIconOpen');
  var iconClose = document.getElementById('navIconClose');
  if (navToggle && mobilePanel) {
    navToggle.addEventListener('click', function () {
      var isOpen = mobilePanel.classList.toggle('open');
      iconOpen.classList.toggle('hidden', isOpen);
      iconClose.classList.toggle('hidden', !isOpen);
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mobilePanel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mobilePanel.classList.remove('open');
        iconOpen.classList.remove('hidden');
        iconClose.classList.add('hidden');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();

// Daily Wisdom Deck - Swiper "cards" effect (same swipe technique as tokenology.mubien.com)
(function () {
  var el = document.getElementById('wisdomSwiper');
  var prevBtn = document.getElementById('swipePrev');
  var nextBtn = document.getElementById('swipeNext');
  if (!el || typeof Swiper === 'undefined') return;

  var wisdomSwiper = new Swiper('#wisdomSwiper', {
    effect: 'cards',
    grabCursor: true,
    loop: true,
    cardsEffect: {
      perSlideRotate: 4,
      perSlideOffset: 9,
      slideShadows: false,
    },
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { wisdomSwiper.slidePrev(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { wisdomSwiper.slideNext(); });
})();

// Expert Minds - swipeable testimonial carousel
(function () {
  var cardWrap = document.getElementById('expertCardWrap');
  var avatar = document.getElementById('expertAvatar');
  var content = document.getElementById('expertContent');
  var nameEl = document.getElementById('expertName');
  var starsEl = document.getElementById('expertStars');
  var ratingNumEl = document.getElementById('expertRatingNum');
  var bioEl = document.getElementById('expertBio');
  var leftImg = document.getElementById('leftCoachImg');
  var leftRating = document.getElementById('leftCoachRating');
  var leftWrap = document.getElementById('leftCoachWrap');
  var rightImg = document.getElementById('rightCoachImg');
  var rightRating = document.getElementById('rightCoachRating');
  var rightWrap = document.getElementById('rightCoachWrap');
  var prevBtn = document.getElementById('expertPrevBtn');
  var nextBtn = document.getElementById('expertNextBtn');
  if (!cardWrap || !avatar || !content || !nameEl) return;

  var experts = [
    {
      avatar: 'images/expert1.png', name: 'Zayn Omar', rating: 4.9,
      bio: 'I’m a yoga coach dedicated to helping people build strength, flexibility, and inner balance through mindful movement and breathwork. My approach focuses on simple, effective practices that fit into everyday life, guiding students toward better posture, reduced stress, and a deeper connection between body and mind.'
    },
    {
      avatar: 'images/expert2.png', name: 'Amira Cole', rating: 4.8,
      bio: 'A tai chi and mindfulness coach guiding students through slow, deliberate movement to build balance, focus, and calm. I blend traditional forms with modern breathing techniques to help you find steadiness in both body and mind, one session at a time.'
    },
    {
      avatar: 'images/expert3f.png', name: 'Malik Hassan', rating: 5.0,
      bio: 'A breathwork and meditation specialist helping clients release tension and reconnect with stillness. My sessions combine guided breathing, sound, and quiet reflection to leave you calmer, more centered, and better equipped for daily life.'
    },
  ];

  var index = 0;
  var animating = false;

  function starsHtml(rating) {
    var filled = Math.max(0, Math.min(5, Math.round(rating)));
    var html = '';
    for (var i = 0; i < filled; i++) html += '★';
    if (filled < 5) {
      html += '<span class="text-white/25">';
      for (var j = filled; j < 5; j++) html += '★';
      html += '</span>';
    }
    return html;
  }

  function render() {
    var center = experts[index];
    var left = experts[(index + experts.length - 1) % experts.length];
    var right = experts[(index + 1) % experts.length];

    avatar.src = center.avatar;
    avatar.alt = center.name;
    nameEl.textContent = center.name;
    starsEl.innerHTML = starsHtml(center.rating);
    ratingNumEl.textContent = center.rating.toFixed(1);
    bioEl.textContent = center.bio;

    if (leftImg) { leftImg.src = left.avatar; leftImg.alt = left.name; }
    if (leftRating) leftRating.innerHTML = Math.round(left.rating) + '<span class="text-amber-400">★</span>';

    if (rightImg) { rightImg.src = right.avatar; rightImg.alt = right.name; }
    if (rightRating) rightRating.innerHTML = Math.round(right.rating) + '<span class="text-amber-400">★</span>';
  }

  var CARD_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
  var CARD_DURATION = 380;

  function setWrapStyle(x, rotate, opacity, scale, useTransition) {
    cardWrap.style.transition = useTransition
      ? 'transform ' + CARD_DURATION + 'ms ' + CARD_EASE + ', opacity ' + CARD_DURATION + 'ms ' + CARD_EASE
      : 'none';
    cardWrap.style.transform = 'translateX(' + x + 'px) rotate(' + rotate + 'deg) scale(' + scale + ')';
    cardWrap.style.opacity = String(opacity);
  }

  function go(direction) {
    if (animating) return;
    animating = true;
    // outgoing card slides out, fades, and scales down slightly
    setWrapStyle(direction * -90, direction * -6, 0, 0.94, true);

    window.setTimeout(function () {
      index = (index + direction + experts.length) % experts.length;
      render();
      // incoming card starts from the opposite side, scaled down, then eases to center at 100%
      setWrapStyle(direction * 90, direction * 6, 0, 0.94, false);
      void cardWrap.offsetWidth;
      setWrapStyle(0, 0, 1, 1, true);
      animating = false;
    }, CARD_DURATION);
  }

  if (prevBtn) prevBtn.addEventListener('click', function () { go(-1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { go(1); });
  if (leftWrap) leftWrap.addEventListener('click', function () { go(-1); });
  if (rightWrap) rightWrap.addEventListener('click', function () { go(1); });

  // Drag / touch swipe on the testimonial card itself
  var dragging = false;
  var startX = 0;
  var startY = 0;

  function onPointerDown(e) {
    if (animating) return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    cardWrap.style.cursor = 'grabbing';
    if (cardWrap.setPointerCapture) {
      try { cardWrap.setPointerCapture(e.pointerId); } catch (err) { }
    }
  }

  function onPointerMove(e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    setWrapStyle(dx, dx * 0.03, Math.max(1 - Math.abs(dx) / 400, 0.4), 1, false);
  }

  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    cardWrap.style.cursor = 'grab';
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 70) {
      go(dx < 0 ? 1 : -1);
    } else {
      setWrapStyle(0, 0, 1, 1, true);
    }
  }

  cardWrap.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
})();

// Personalized Guidance - tab switching
(function () {
  var tabsWrap = document.getElementById('pgTabs');
  var panelText = document.getElementById('pgPanelText');
  var heading = document.getElementById('pgHeading');
  var desc = document.getElementById('pgDesc');
  var exploreLink = document.getElementById('pgExploreLink');
  if (!tabsWrap || !panelText || !heading || !desc) return;

  var content = {
    coaches: {
      heading: 'Coach &amp; Wellness centre\'s:',
      desc: 'Journey inward with direct support from our master instructors. Our personalized sessions offer a serene path to wellness.',
      exploreLabel: 'Explore Coaches',
      target: '#expert-minds'
    },
    wellness: {
      heading: 'Wellness Centres:',
      desc: 'Discover partnered wellness centres offering curated retreats, workshops, and community classes tailored to your practice.',
      exploreLabel: 'Explore Wellness Centres',
      target: '#join-community'
    },
    schools: {
      heading: 'Accredited Schools:',
      desc: 'Connect with schools teaching authentic yoga, tai chi, and meditation lineages, from beginner courses to teacher certification.',
      exploreLabel: 'Explore Schools',
      target: '#join-community'
    },
    partners: {
      heading: 'Trusted Partners:',
      desc: 'Explore our network of partner studios, brands, and practitioners collaborating to bring you a richer wellness journey.',
      exploreLabel: 'Explore Partners',
      target: '#join-community'
    }
  };

  var tabs = Array.prototype.slice.call(tabsWrap.querySelectorAll('.pg-tab'));
  var animating = false;
  var activeTarget = content.coaches.target;

  function activate(tab) {
    var key = tab.getAttribute('data-tab');
    var data = content[key];
    if (!data || animating) return;
    animating = true;

    tabs.forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');

    panelText.style.opacity = '0';
    window.setTimeout(function () {
      heading.innerHTML = data.heading;
      desc.textContent = data.desc;
      if (exploreLink) {
        exploreLink.textContent = data.exploreLabel;
        exploreLink.setAttribute('href', data.target);
      }
      activeTarget = data.target;
      panelText.style.opacity = '1';
      animating = false;
    }, 200);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () { activate(tab); });
  });

  if (exploreLink) {
    exploreLink.addEventListener('click', function (e) {
      var el = document.querySelector(activeTarget);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
})();

// Courses & Specialized Practices - Explore Now scrolls to the course cards
(function () {
  document.querySelectorAll('.course-explore-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var target = document.getElementById('specialized-practices');
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

// Courses & Specialized Practices - stacked-card slide-up switch (autoplay + dots)
(function () {
  var stage = document.getElementById('courseStage');
  var baseCard = document.getElementById('courseCardBase');
  var risingCard = document.getElementById('courseCardRising');
  var dotsWrap = document.getElementById('courseDots');
  if (!stage || !baseCard || !risingCard || !dotsWrap) return;

  var categories = [
    {
      title: 'Learn from<br />Experts.',
      desc: 'Master the ancient arts with modern instruction.<br class="hidden sm:inline" />From deep-flow Yoga to the moving meditation of minds.',
      icon: 'images/events.svg',
      alt: 'Yoga Icon',
      bg: 'linear-gradient(88.01deg, #43366B 10.28%, #312357 104.01%)'
    },
    {
      title: 'Learn from<br />Tai Chi Masters.',
      desc: 'Our signature series blends the fluid strength of Vinyasa<br class="hidden sm:inline" />with the grounding energy of Tai Chi.',
      icon: 'images/moon-stars.png',
      alt: 'Tai Chi Icon',
      bg: 'linear-gradient(88.01deg, #3E3A5E 10.28%, #262042 104.01%)'
    },
    {
      title: 'Learn from<br />Meditation Guides.',
      desc: 'Guided breathwork and stillness practices to align<br class="hidden sm:inline" />your body and spirit under the celestial canopy.',
      icon: 'images/brain.png',
      alt: 'Meditation Icon',
      bg: 'linear-gradient(88.01deg, #6B4A72 10.28%, #3D2A52 104.01%)'
    },
    {
      title: 'Learn from<br />Master Coaches.',
      desc: 'Real coaches, personalized to your pace —<br class="hidden sm:inline" />not just pre-recorded clips.',
      icon: 'images/session.png',
      alt: 'Coaching Icon',
      bg: 'linear-gradient(88.01deg, #4A3B7C 10.28%, #241C42 104.01%)'
    }
  ];

  var SWAP_DELAY = 1000; // ms - matches the .course-card-rising CSS transition duration
  var AUTOPLAY_MS = 2000;
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reducedMotion) SWAP_DELAY = 0;

  var index = 0;
  var animating = false;
  var autoplayTimer = null;

  var dots = categories.map(function (cat, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'course-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    dot.setAttribute('aria-label', 'Show course category ' + (i + 1) + ' of ' + categories.length);
    dot.addEventListener('click', function () { goTo(i); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function updateDots() {
    dots.forEach(function (dot, i) {
      var isActive = i === index;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function populateCard(card, cat) {
    card.style.background = cat.bg;
    card.querySelector('.course-title').innerHTML = cat.title;
    card.querySelector('.course-desc').innerHTML = cat.desc;
    var icon = card.querySelector('.course-icon');
    icon.src = cat.icon;
    icon.alt = cat.alt;
  }

  // Rising card slides straight up from below, covering the static base card -
  // like a page being pulled up from a stack. Once it fully covers the base,
  // we copy its content into the base and instantly reset the rising card
  // back below (invisibly, with transitions disabled for that one step).
  function goTo(newIndex) {
    if (animating || newIndex === index) return;
    animating = true;
    stopAutoplay();

    index = newIndex;
    populateCard(risingCard, categories[index]);
    updateDots();

    risingCard.classList.add('is-up');

    window.setTimeout(function () {
      populateCard(baseCard, categories[index]);

      risingCard.style.transition = 'none';
      risingCard.classList.remove('is-up');
      void risingCard.offsetWidth; // force the reset to apply instantly, no visible snap-back
      risingCard.style.transition = '';

      animating = false;
      startAutoplay();
    }, SWAP_DELAY);
  }

  function next() {
    goTo((index + 1) % categories.length);
  }

  function startAutoplay() {
    if (reducedMotion) return;
    stopAutoplay();
    autoplayTimer = window.setTimeout(next, AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  stage.addEventListener('mouseenter', stopAutoplay);
  stage.addEventListener('mouseleave', startAutoplay);

  startAutoplay();

  // Scroll-hijack: while this section is the one currently in view, mouse-wheel
  // scrolling cycles through the 4 cards first. Only once the user has scrolled
  // past the last card (or before the first) does the wheel event fall through
  // and let the page's own scroll-snap move to the next/previous section.
  var sectionEl = document.getElementById('courses-check');
  var sectionActive = false;
  var wheelCooldown = false;

  if (sectionEl && typeof IntersectionObserver !== 'undefined') {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
      });
    }, { threshold: [0, 0.6, 1] });
    sectionObserver.observe(sectionEl);

    sectionEl.addEventListener('wheel', function (e) {
      if (!sectionActive) return;

      var atLast = index === categories.length - 1;
      var atFirst = index === 0;

      if (e.deltaY > 0 && !atLast) {
        e.preventDefault();
        if (!wheelCooldown) {
          wheelCooldown = true;
          goTo(index + 1);
          window.setTimeout(function () { wheelCooldown = false; }, SWAP_DELAY + 150);
        }
      } else if (e.deltaY < 0 && !atFirst) {
        e.preventDefault();
        if (!wheelCooldown) {
          wheelCooldown = true;
          goTo(index - 1);
          window.setTimeout(function () { wheelCooldown = false; }, SWAP_DELAY + 150);
        }
      }
      // else: already at the boundary card in this direction - let the event
      // through so the page can scroll to the next/previous section.
    }, { passive: false });
  }
})();
