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

  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var wisdomSwiper = new Swiper('#wisdomSwiper', {
    effect: 'cards',
    grabCursor: true,
    simulateTouch: true,
    loop: false,
    cardsEffect: {
      perSlideRotate: 5,
      perSlideOffset: 10,
      slideShadows: true,
    },
    autoplay: false,
  });

  if (prevBtn) prevBtn.addEventListener('click', function () { wisdomSwiper.slidePrev(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { wisdomSwiper.slideNext(); });

  // 3D tilt-on-hover: applied to an inner wrapper (.deck-tilt) inside the
  // active slide, kept separate from Swiper's own transform on the slide
  // element itself so the two never fight each other.
  if (!reducedMotion) {
    var TILT_MAX = 10; // degrees
    el.addEventListener('mousemove', function (e) {
      var activeTilt = el.querySelector('.swiper-slide-active .deck-tilt');
      if (!activeTilt) return;
      var rect = activeTilt.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var rotateY = (px - 0.5) * TILT_MAX * 2;
      var rotateX = (0.5 - py) * TILT_MAX * 2;
      activeTilt.style.transform = 'perspective(700px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' + rotateY.toFixed(2) + 'deg) scale3d(1.02, 1.02, 1.02)';
    });

    el.addEventListener('mouseleave', function () {
      var activeTilt = el.querySelector('.swiper-slide-active .deck-tilt');
      if (activeTilt) activeTilt.style.transform = '';
    });
  }

  // Play the deck's entrance once when the section becomes visible. Card
  // navigation remains native Swiper interaction: drag/swipe or the buttons.
  var sectionEl = document.getElementById('wisdom-deck');
  var introPlayed = false;

  function playFirstVisitAnimation() {
    if (introPlayed) return;
    introPlayed = true;

    var slides = el.querySelectorAll('.swiper-slide');
    slides.forEach(function (slide, index) {
      var card = slide.querySelector('.deck-tilt') || slide;
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px) scale(0.97)';
    });

    window.setTimeout(function () {
      slides.forEach(function (slide, index) {
        var card = slide.querySelector('.deck-tilt') || slide;
        card.style.transition = 'opacity 420ms cubic-bezier(0.22, 1, 0.36, 1), transform 420ms cubic-bezier(0.22, 1, 0.36, 1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      });
    }, 60);
  }

  if (sectionEl && typeof IntersectionObserver !== 'undefined') {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.6 && !introPlayed) {
          playFirstVisitAnimation();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    sectionObserver.observe(sectionEl);
  } else {
    playFirstVisitAnimation();
  }
})();

// Expert Minds - swipeable testimonial carousel
(function () {
  function getEl(id, className) {
    return document.getElementById(id) || document.querySelector('.' + className);
  }

  var cardWrap = getEl('expertCardWrap', 'expert-card-wrap');
  var avatar = getEl('expertAvatar', 'expert-avatar');
  var content = getEl('expertContent', 'expert-content');
  var nameEl = getEl('expertName', 'expert-name');
  var starsEl = getEl('expertStars', 'expert-stars');
  var ratingNumEl = getEl('expertRatingNum', 'expert-rating-num');
  var bioEl = getEl('expertBio', 'expert-bio');

  var leftWrap = getEl('leftCoachWrap', 'left-coach-wrap');
  var leftImg = getEl('leftCoachImg', 'left-coach-img');
  var leftRating = getEl('leftCoachRating', 'left-coach-rating');

  var rightWrap = getEl('rightCoachWrap', 'right-coach-wrap');
  var rightImg = getEl('rightCoachImg', 'right-coach-img');
  var rightRating = getEl('rightCoachRating', 'right-coach-rating');

  if (!cardWrap || !avatar || !nameEl) return;

  var experts = [
    {
      avatar: 'images/expert1.png', name: 'Zayn Omar', rating: 4.9,
      bio: 'I\u2019m a yoga coach dedicated to helping people build strength, flexibility, and inner balance through mindful movement and breathwork. My approach focuses on simple, effective practices that fit into everyday life, guiding students toward better posture, reduced stress, and a deeper connection between body and mind.'
    },
    {
      avatar: 'images/expert2.png', name: 'Mustafa Quraish', rating: 5.0,
      bio: 'Guides students through "meditation in motion", blending slow, low-impact movements with deep breathing and mental focus. They specialize in helping individuals improve their balance, flexibility, and overall well-being, while teaching the fundamentals of body alignment and stress reduction.'
    },
    {
      avatar: 'images/expert3f.png', name: 'Amira Cole', rating: 4.8,
      bio: 'A tai chi and mindfulness coach guiding students through slow, deliberate movement to build balance, focus, and calm. I blend traditional forms with modern breathing techniques to help you find steadiness in both body and mind, one session at a time.'
    }
  ];

  var index = 0;
  var animating = false;
  var introPlayed = false;

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

  function setTransitionState(el, isActive) {
    if (!el) return;
    el.classList.toggle('is-transitioning', !isActive);
    el.classList.toggle('is-active', isActive);
  }

  // expert at a relative offset from the current index, wrapping infinitely
  function expertAt(offset) {
    var n = experts.length;
    return experts[((index + offset) % n + n) % n];
  }

  function render() {
    var center = experts[index];
    var left = expertAt(-1);
    var right = expertAt(1);

    avatar.src = center.avatar;
    avatar.alt = center.name;
    if (nameEl) nameEl.textContent = center.name;
    if (starsEl) starsEl.innerHTML = starsHtml(center.rating);
    if (ratingNumEl) ratingNumEl.textContent = center.rating.toFixed(1);
    if (bioEl) bioEl.textContent = center.bio;

    if (leftImg) { leftImg.src = left.avatar; leftImg.alt = left.name; }
    if (leftRating) leftRating.innerHTML = Math.round(left.rating) + '<span class="text-amber-400">★</span>';

    if (rightImg) { rightImg.src = right.avatar; rightImg.alt = right.name; }
    if (rightRating) rightRating.innerHTML = Math.round(right.rating) + '<span class="text-amber-400">★</span>';
  }

  function playFirstEntryAnimation() {
    if (introPlayed) return;
    introPlayed = true;

    setTransitionState(avatar, false);
    setTransitionState(content, false);
    setTransitionState(leftWrap, false);
    setTransitionState(rightWrap, false);

    render();

    requestAnimationFrame(function () {
      setTransitionState(avatar, true);
      setTransitionState(content, true);
      setTransitionState(leftWrap, true);
      setTransitionState(rightWrap, true);
    });
  }

  var TOTAL_TIME = 620;       // full slide duration
  var TEXT_HOLD_TIME = 220;   // how long content stays faded out before swapping in

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function centerOf(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function makeFlyer(imageSrc, size) {
    var el = document.createElement('img');
    el.src = imageSrc;
    el.className = 'flying-avatar';
    if (size) {
      el.style.width = size + 'px';
      el.style.height = size + 'px';
    }
    document.body.appendChild(el);
    return el;
  }

  // Straight horizontal line from `from` to `to`. Handles optional
  // fade-in (used for the avatar entering off-screen) and fade-out
  // (used for the avatar exiting off-screen) so nothing pops.
  function flyStraight(el, from, to, duration, opts, onDone) {
    opts = opts || {};
    var startScale = opts.startScale != null ? opts.startScale : 1;
    var endScale = opts.endScale != null ? opts.endScale : 1;
    var start = null;

    function frame(time) {
      if (!start) start = time;
      var raw = (time - start) / duration;
      if (raw > 1) raw = 1;
      var t = easeOutCubic(raw);

      var x = lerp(from.x, to.x, t);
      var y = lerp(from.y, to.y, t);
      var scale = lerp(startScale, endScale, t);

      var opacity = 1;
      if (opts.fadeIn) opacity = raw < 0.3 ? lerp(0, 1, raw / 0.3) : opacity;
      if (opts.fadeOut) opacity = raw > 0.7 ? Math.min(opacity, lerp(1, 0, (raw - 0.7) / 0.3)) : opacity;

      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.transform = 'translate(-50%,-50%) scale(' + scale + ')';
      el.style.opacity = opacity;

      if (raw < 1) {
        requestAnimationFrame(frame);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  function go(direction) {
    if (animating) return;
    animating = true;

    var centerWrap = avatar.parentElement;
    var centerRect = centerOf(centerWrap.getBoundingClientRect());
    var leftRect = centerOf(leftWrap.getBoundingClientRect());
    var rightRect = centerOf(rightWrap.getBoundingClientRect());

    // Off-screen exit/enter points, mirrored the same distance beyond
    // the left/right slots as those slots are from center — this is
    // what makes the outgoing avatar keep travelling in a straight
    // line past the slot instead of stopping there.
    var exitX = leftRect.x - (centerRect.x - leftRect.x);
    var enterX = rightRect.x + (rightRect.x - centerRect.x);

    var incomingWrapRect = direction > 0 ? rightRect : leftRect;   // side -> center
    var outgoingWrapRect = direction > 0 ? leftRect : rightRect;   // center -> side
    var exitPoint = direction > 0 ? { x: exitX, y: leftRect.y } : { x: enterX, y: rightRect.y };
    var enterPoint = direction > 0 ? { x: enterX, y: rightRect.y } : { x: exitX, y: leftRect.y };

    var incomingImgSrc = direction > 0 ? rightImg.src : leftImg.src;
    var centerImgSrc = avatar.src;
    var outgoingImgSrc = direction > 0 ? leftImg.src : rightImg.src;
    var newUpcoming = direction > 0 ? expertAt(2) : expertAt(-2);

    var centerSize = avatar.getBoundingClientRect().width;
    var sideSize = leftImg.getBoundingClientRect().width || centerSize;

    // Hide the real elements — the four clones below fully represent
    // them until the flight finishes, so the underlying src swap
    // (in render(), fired mid-flight) is never visible.
    leftImg.style.opacity = 0;
    rightImg.style.opacity = 0;
    avatar.style.opacity = 0;
    if (leftRating) leftRating.style.opacity = 0;
    if (rightRating) rightRating.style.opacity = 0;

 // same size throughout
var flyer1 = makeFlyer(incomingImgSrc, sideSize);
flyStraight(flyer1, incomingWrapRect, centerRect, TOTAL_TIME, { startScale: 1, endScale: 1 }, function () { flyer1.remove(); });

var flyer2 = makeFlyer(centerImgSrc, centerSize);
flyStraight(flyer2, centerRect, outgoingWrapRect, TOTAL_TIME, { startScale: 1, endScale: 1 }, function () { flyer2.remove(); });

var flyer3 = makeFlyer(outgoingImgSrc, sideSize);
flyStraight(flyer3, outgoingWrapRect, exitPoint, TOTAL_TIME, { startScale: 1, endScale: 1, fadeOut: true }, function () { flyer3.remove(); });

var flyer4 = makeFlyer(newUpcoming.avatar, sideSize);
flyStraight(flyer4, enterPoint, incomingWrapRect, TOTAL_TIME, { startScale: 1, endScale: 1, fadeIn: true }, function () { flyer4.remove(); });

    // crossfade the text block independently of the avatar flight
    setTransitionState(content, false);
    setTimeout(function () {
      index = (index + direction + experts.length) % experts.length;
      render(); // updates real elements while still hidden — no pop
      setTransitionState(content, true);
    }, TEXT_HOLD_TIME);

    // reveal the real elements at the exact instant the clones land
    setTimeout(function () {
      leftImg.style.opacity = '';
      rightImg.style.opacity = '';
      avatar.style.opacity = '';
      if (leftRating) leftRating.style.opacity = '';
      if (rightRating) rightRating.style.opacity = '';
      animating = false;
    }, TOTAL_TIME);
  }

  playFirstEntryAnimation();

  document.addEventListener('click', function (e) {
    if (animating) return;
    var prev = e.target.closest('#expertPrevBtn,#leftCoachWrap');
    var next = e.target.closest('#expertNextBtn,#rightCoachWrap');
    if (prev) { e.preventDefault(); go(-1); }
    if (next) { e.preventDefault(); go(1); }
  });

  // Swipe / drag support on the center card
  var dragStartX = null;
  var dragPointerId = null;
  var SWIPE_THRESHOLD = 50;

  cardWrap.addEventListener('pointerdown', function (e) {
    if (animating) return;
    dragStartX = e.clientX;
    dragPointerId = e.pointerId;
    cardWrap.setPointerCapture(e.pointerId);
    cardWrap.style.cursor = 'grabbing';
  });

  cardWrap.addEventListener('pointerup', function (e) {
    if (dragStartX === null) return;
    var dx = e.clientX - dragStartX;
    dragStartX = null;
    cardWrap.style.cursor = 'grab';
    if (dx <= -SWIPE_THRESHOLD) go(1);
    else if (dx >= SWIPE_THRESHOLD) go(-1);
  });

  cardWrap.addEventListener('pointercancel', function () {
    dragStartX = null;
    cardWrap.style.cursor = 'grab';
  });
})();

// Personalized Guidance - tab switching
(function () {
  var tabsWrap = document.getElementById('pgTabs');
  var panelText = document.getElementById('pgPanelText');
  var heading = document.getElementById('pgHeading');
  var desc = document.getElementById('pgDesc');
  var exploreLink = document.getElementById('pgExploreLink');

  // Target the brain <img> tag inside .brain-bg
  var brainImg = document.querySelector('.brain-bg > img');

  if (!tabsWrap || !panelText || !heading || !desc) return;

  var content = {
    coaches: {
      heading: 'Coach &amp; Wellness centre\'s:',
      desc: 'Journey inward with direct support from our master instructors. Our personalized sessions offer a serene path to wellness.',
      exploreLabel: 'Explore Coaches',
      target: '#expert-minds',
      image: 'images/brain.png'
    },
    wellness: {
      heading: 'Wellness Centres:',
      desc: 'Discover partnered wellness centres offering curated retreats, workshops, and community classes tailored to your practice.',
      exploreLabel: 'Explore Wellness Centres',
      target: '#join-community',
      image: 'images/wellness-bg.svg' // Update to your image path
    },
    schools: {
      heading: 'Accredited Schools:',
      desc: 'Connect with schools teaching authentic yoga, tai chi, and meditation lineages, from beginner courses to teacher certification.',
      exploreLabel: 'Explore Schools',
      target: '#join-community',
      image: 'images/schools-bg.svg' // Update to your image path
    },
    partners: {
      heading: 'Trusted Partners:',
      desc: 'Explore our network of partner studios, brands, and practitioners collaborating to bring you a richer wellness journey.',
      exploreLabel: 'Explore Partners',
      target: '#join-community',
      image: 'images/partner-bg.svg' // Update to your image path
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

    // Fade out text and image
    panelText.style.opacity = '0';
    if (brainImg) {
      brainImg.style.transition = 'opacity .25s ease';
      brainImg.style.opacity = '0';
    }

    window.setTimeout(function () {
      // Update text details
      heading.innerHTML = data.heading;
      desc.textContent = data.desc;
      if (exploreLink) {
        exploreLink.textContent = data.exploreLabel;
        exploreLink.setAttribute('href', data.target);
      }

      // Update image source
      if (brainImg && data.image) {
        brainImg.src = data.image;
        brainImg.style.display = 'block'; // Reset if hidden by onerror
        brainImg.style.opacity = '1';
      }

      activeTarget = data.target;
      panelText.style.opacity = '1';
      animating = false;
    }, 250);
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

// Courses & Specialized Practices - stacked-card slide-up switch (scroll-driven)
(function () {
  var stage = document.getElementById('courseStage');
  var baseCard = document.getElementById('courseCardBase');
  var risingCard = document.getElementById('courseCardRising');
  var dotsWrap = document.getElementById('courseDots');
  var badgeIcon = document.getElementById('badge-icon');
  var awardSealImg = document.getElementById('awardSealImg');

  if (!stage || !baseCard || !risingCard || !dotsWrap) return;

  // The stacked-card interaction is autoplay/wheel driven; it does not need
  // a visible pagination indicator beneath the cards. Inline display wins
  // over the Tailwind `flex` utility on the element.
  dotsWrap.style.display = 'none';

  var categories = [
    {
      title: 'Learn from<br />Experts.',
      desc: 'Master the ancient arts with modern instruction.<br class="hidden sm:inline" />From deep-flow Yoga to the moving meditation of minds.',
      icon: 'images/events.svg',
      badgeIcon: 'images/badge.png', // Badge image for this state
      alt: 'Yoga Icon',
      bg: 'linear-gradient(88.01deg, #43366B 10.28%, #312357 104.01%)'
    },
    {
      title: "Gym & Wellness<br />Center's.",
      desc: 'Master the ancient arts with modern instruction.<br class="hidden sm:inline" />From deep-flow Yoga to the moving meditation of minds.',
      icon: 'images/gym-main.svg',
      badgeIcon: 'images/gym-badge.png',
      alt: 'Gym Icon',
      bg: 'linear-gradient(97.35deg, rgba(170, 166, 179, 0.2538) -5.62%, rgba(33, 26, 59, 0.27) 111.1%)'

    },
    {
      title: 'Amazing<br />Ettazenn HUB.',
      desc: 'Master the ancient arts with modern instruction.<br class="hidden sm:inline" />From deep-flow Yoga to the moving meditation of minds.',
      icon: 'images/amazing-hub-main.svg',
      badgeIcon: 'images/amazing-hub-badge.svg',
      alt: 'Ettazenn Hub Icon',
      bg: 'url("images/amazing-bg1.svg") center/cover no-repeat'
    },
    {
      title: 'Listen Meditation<br />Music.',
      desc: 'Master the ancient arts with modern instruction.<br class="hidden sm:inline" />From deep-flow Yoga to the moving meditation of minds.',
      icon: 'images/music-main.svg',
      badgeIcon: 'images/music-badge.svg',
      alt: 'Meditation Music Icon',
      bg: 'linear-gradient(97.35deg, rgba(170, 166, 179, 0.2538) -5.62%, rgba(33, 26, 59, 0.27) 111.1%)'

    }
  ];

  var SWAP_DELAY = 500; // matches the reference card-lift duration
  var reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reducedMotion) SWAP_DELAY = 0;

  var index = 0;
  var animating = false;
  var autoplayTimer = null;
  var wheelCooldown = false;
  var firstVisitLocked = true;
  var touchStartY = null;
  var gestureBlocked = false;

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

  // Fade the floating badge out with the outgoing card, swap its asset while
  // the incoming card covers the stage, then fade it back in before landing.
  function updateBadgeIcon(cat) {
    if (!badgeIcon || !awardSealImg) return;
    badgeIcon.style.transition = 'opacity 180ms ease-in-out';
    badgeIcon.style.opacity = '0';
    setTimeout(function () {
      awardSealImg.src = cat.badgeIcon;
      requestAnimationFrame(function () {
        badgeIcon.style.opacity = '1';
      });
    }, Math.round(SWAP_DELAY / 2));
  }

  function goTo(newIndex) {
    if (animating || newIndex === index) return;
    animating = true;
    stopAutoplay();
    var movingBackward = newIndex < index;

    // Put the incoming card on the correct outer edge without animating its
    // reset. Forward cards rise from below; previous cards descend from above.
    risingCard.style.transition = 'none';
    risingCard.classList.remove('is-up');
    risingCard.classList.toggle('from-top', movingBackward);
    void risingCard.offsetWidth;
    risingCard.style.transition = '';

    index = newIndex;
    populateCard(risingCard, categories[index]);
    updateDots();
    updateBadgeIcon(categories[index]);

    requestAnimationFrame(function () {
      risingCard.classList.add('is-up');
    });

    window.setTimeout(function () {
      populateCard(baseCard, categories[index]);

      risingCard.style.transition = 'none';
      risingCard.classList.remove('is-up');
      risingCard.classList.remove('from-top');
      void risingCard.offsetWidth; // force reset to apply instantly
      risingCard.style.transition = '';

      animating = false;
      startAutoplay();
    }, SWAP_DELAY);
  }

  function next() {
    goTo((index + 1) % categories.length);
  }

  function startAutoplay() {
    // Cards advance only through the section's wheel interaction.
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Scroll-hijack logic
  var sectionEl = document.getElementById('courses-check');
  var sectionActive = false;
  var scrollLocked = false;

  function setScrollLock(locked) {
    if (scrollLocked === locked) return;
    scrollLocked = locked;
    document.body.style.overflow = locked ? 'hidden' : '';
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    document.body.style.height = locked ? '100%' : '';
    document.documentElement.style.height = locked ? '100%' : '';
  }

  function updateScrollLock() {
    var shouldLock = firstVisitLocked && sectionActive && index < categories.length - 1;
    setScrollLock(shouldLock);
  }

  function releaseSectionFlow() {
    firstVisitLocked = false;
    gestureBlocked = false;
    touchStartY = null;
    setScrollLock(false);
  }

  function advanceToNextCard() {
    if (!sectionActive || animating) {
      if (index >= categories.length - 1) {
        releaseSectionFlow();
      }
      return false;
    }

    if (index >= categories.length - 1) {
      releaseSectionFlow();
      return false;
    }

    if (wheelCooldown || gestureBlocked) return false;
    wheelCooldown = true;
    gestureBlocked = true;
    goTo(index + 1);
    window.setTimeout(function () { wheelCooldown = false; }, SWAP_DELAY + 220);
    window.setTimeout(function () { gestureBlocked = false; }, SWAP_DELAY + 260);
    return true;
  }

  function advanceToPreviousCard() {
    if (!sectionActive || animating || index <= 0 || wheelCooldown || gestureBlocked) return false;

    wheelCooldown = true;
    gestureBlocked = true;
    goTo(index - 1);
    window.setTimeout(function () { wheelCooldown = false; }, SWAP_DELAY + 220);
    window.setTimeout(function () { gestureBlocked = false; }, SWAP_DELAY + 260);
    return true;
  }

  if (sectionEl && typeof IntersectionObserver !== 'undefined') {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
        updateScrollLock();
      });
    }, { threshold: [0, 0.6, 1] });
    sectionObserver.observe(sectionEl);

    sectionEl.addEventListener('wheel', function (e) {
      if (!sectionActive) return;

      if (animating) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      var delta = e.deltaY;
      var isAtFinalCard = index >= categories.length - 1;

      if (delta > 0) {
        if (isAtFinalCard) {
          releaseSectionFlow();
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        advanceToNextCard();
      } else if (delta < 0) {
        if (index <= 0) {
          releaseSectionFlow();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        advanceToPreviousCard();
      }
    }, { passive: false });

    sectionEl.addEventListener('touchstart', function (e) {
      if (!sectionActive || animating || index >= categories.length - 1) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    sectionEl.addEventListener('touchmove', function (e) {
      if (!sectionActive || animating || index >= categories.length - 1 || touchStartY === null || gestureBlocked) return;

      var touchY = e.touches[0].clientY;
      var delta = touchY - touchStartY;

      if (delta < -60) {
        e.preventDefault();
        e.stopPropagation();
        touchStartY = null;
        advanceToNextCard();
      } else if (delta > 60) {
        e.preventDefault();
        e.stopPropagation();
        touchStartY = null;
        advanceToPreviousCard();
      }
    }, { passive: false });

    sectionEl.addEventListener('touchend', function () {
      touchStartY = null;
      gestureBlocked = false;
    }, { passive: true });
  }
})();
