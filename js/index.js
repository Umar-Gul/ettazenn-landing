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

  // Scroll-hijack: while this section is the one currently in view, mouse-wheel
  // scrolling draws through the cards first. Only once the user has scrolled
  // past the last card (or before the first) does the wheel event fall through
  // and let the page's own scroll-snap move to the next/previous section.
  var sectionEl = document.getElementById('wisdom-deck');
  var sectionActive = false;
  var wheelCooldown = false;
  var touchStartY = null;
  var gestureBlocked = false;
  var introPlayed = false;
  var deckGuideActive = false;

  function advanceWisdom(direction) {
    if (direction <= 0) return false;

    var atLast = wisdomSwiper.isEnd;
    if (atLast) return false;
    if (wheelCooldown || gestureBlocked) return false;

    wheelCooldown = true;
    gestureBlocked = true;

    wisdomSwiper.slideNext();

    if (wisdomSwiper.isEnd) {
      deckGuideActive = false;
    }

    window.setTimeout(function () { wheelCooldown = false; }, 650);
    window.setTimeout(function () { gestureBlocked = false; }, 700);
    return true;
  }

  function playFirstVisitAnimation() {
    if (introPlayed) return;
    introPlayed = true;
    deckGuideActive = true;

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
        sectionActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
        if (sectionActive && !introPlayed) {
          playFirstVisitAnimation();
        }
      });
    }, { threshold: [0, 0.6, 1] });
    sectionObserver.observe(sectionEl);

    sectionEl.addEventListener('wheel', function (e) {
      if (!sectionActive || !deckGuideActive || wisdomSwiper.isEnd) return;

      var delta = e.deltaY;

      if (delta > 0) {
        e.preventDefault();
        e.stopPropagation();
        advanceWisdom(1);
      }
    }, { passive: false });

    sectionEl.addEventListener('touchstart', function (e) {
      if (!sectionActive) return;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    sectionEl.addEventListener('touchmove', function (e) {
      if (!sectionActive || !deckGuideActive || touchStartY === null || gestureBlocked || wisdomSwiper.isEnd) return;

      var touchY = e.touches[0].clientY;
      var delta = touchY - touchStartY;

      if (delta > 60) {
        e.preventDefault();
        e.stopPropagation();
        touchStartY = null;
        advanceWisdom(1);
      } else if (delta < -60) {
        touchStartY = null;
      }
    }, { passive: false });

    sectionEl.addEventListener('touchend', function () {
      touchStartY = null;
      gestureBlocked = false;
    }, { passive: true });
  }
})();

// Expert Minds - swipeable testimonial carousel
(function () {
  function getEl(id, className) {
    return document.getElementById(id) || document.querySelector('.' + className);
  }

  var cardWrap = getEl('expertCardWrap', 'expert-card-wrap');   // stays static, never touched
  var avatar = getEl('expertAvatar', 'expert-avatar');
  var content = getEl('expertContent', 'expert-content');       // name + stars + bio wrapper only
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

  function render() {
    var center = experts[index];
    var left = experts[(index + experts.length - 1) % experts.length];
    var right = experts[(index + 1) % experts.length];

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

  var TEXT_SWAP_TIME = 320; // when name/bio actually swap underneath the fade
  var TOTAL_TIME = 700;     // when the ring animation fully settles

  function resetAnimation(el) {

    el.classList.remove(
      "left-to-center",
      "right-to-center",
      "avatar-to-left",
      "avatar-to-right"
    );

    void el.offsetWidth;
  }
  // ==============================
  // Avatar Flight Animation Helper
  // ==============================

  function animateAvatar(fromWrap, toWrap, imageSrc, duration, callback) {

    const fromRect = fromWrap.getBoundingClientRect();
    const toRect = toWrap.getBoundingClientRect();

    const clone = document.createElement("img");

    clone.src = imageSrc;

    clone.className = "flying-avatar";

    clone.style.left = (fromRect.left + fromRect.width / 2) + "px";
    clone.style.top = (fromRect.top + fromRect.height / 2) + "px";

    document.body.appendChild(clone);

    const startX = fromRect.left + fromRect.width / 2;
    const startY = fromRect.top + fromRect.height / 2;

    const endX = toRect.left + toRect.width / 2;
    const endY = toRect.top + toRect.height / 2;

    const controlX = (startX + endX) / 2;

    // height of curve
    const curveHeight =
      Math.abs(endX - startX) * 0.35;

    const controlY =
      Math.min(startY, endY) - curveHeight;

    let start = null;

    function frame(time) {

      if (!start) start = time;

      let progress = (time - start) / duration;

      if (progress > 1) progress = 1;

      // Ease
      const t = 1 - Math.pow(1 - progress, 3);

      // Quadratic Bezier

      const x =
        (1 - t) * (1 - t) * startX +
        2 * (1 - t) * t * controlX +
        t * t * endX;

      const y =
        (1 - t) * (1 - t) * startY +
        2 * (1 - t) * t * controlY +
        t * t * endY;

      const scale =

        t < .5

          ? 0.72 + t * .6

          : 1.02 - (t - .5) * .2;

      clone.style.left = x + "px";
      clone.style.top = y + "px";

      clone.style.transform =
        `translate(-50%,-50%) scale(${scale})`;

      clone.style.opacity =

        t < .5

          ? .25 + t

          : 1;

      if (progress < 1) {

        requestAnimationFrame(frame);

      } else {

        clone.remove();

        if (callback) callback();

      }

    }

    requestAnimationFrame(frame);

  }

  function getCenterAvatarWrap() {

    return document.querySelector("#expertAvatar").parentElement;

  }

  function go(direction) {

    if (animating) return;
    animating = true;

    var centerWrap = getCenterAvatarWrap();

    var incomingWrap =
      direction > 0
        ? rightWrap
        : leftWrap;

    var outgoingWrap =
      direction > 0
        ? leftWrap
        : rightWrap;

    // Store current images BEFORE render()
    var incomingImg =
      direction > 0
        ? rightImg.src
        : leftImg.src;

    var centerImg = avatar.src;

    // Incoming avatar -> Center
    animateAvatar(
      incomingWrap,
      centerWrap,
      incomingImg,
      TOTAL_TIME
    );

    // Center avatar -> Side
    animateAvatar(
      centerWrap,
      outgoingWrap,
      centerImg,
      TOTAL_TIME
    );

    // Swap content exactly in middle
    setTimeout(function () {

      index =
        (index + direction + experts.length) %
        experts.length;

      render();

    }, TOTAL_TIME / 2);

    // Finish
    setTimeout(function () {

      animating = false;

    }, TOTAL_TIME);

  }

  playFirstEntryAnimation();

  document.addEventListener("click", function (e) {

    if (animating) return;

    const prev = e.target.closest(
      "#expertPrevBtn,#leftCoachWrap"
    );

    const next = e.target.closest(
      "#expertNextBtn,#rightCoachWrap"
    );

    if (prev) {

      e.preventDefault();
      go(-1);

    }

    if (next) {

      e.preventDefault();
      go(1);

    }

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
      // badgeIcon: 'images/amazing-hub-badge.svg',
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

  var SWAP_DELAY = 500; // matches the .course-card-rising CSS transition duration
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

  // Helper to change badge icon smoothly along with card transitions
  function updateBadgeIcon(cat) {
    if (!badgeIcon) return;
    badgeIcon.style.opacity = '0';
    setTimeout(function () {
      if (awardSealImg && cat.badgeIcon) {
        awardSealImg.src = cat.badgeIcon;
      }
      badgeIcon.style.opacity = '1';
    }, 300);
  }

  function goTo(newIndex) {
    if (animating || newIndex === index) return;
    animating = true;
    stopAutoplay();

    index = newIndex;
    populateCard(risingCard, categories[index]);
    updateDots();
    updateBadgeIcon(categories[index]);

    risingCard.classList.add('is-up');

    window.setTimeout(function () {
      populateCard(baseCard, categories[index]);

      risingCard.style.transition = 'none';
      risingCard.classList.remove('is-up');
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
        e.preventDefault();
        e.stopPropagation();
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

      if (delta > 60) {
        e.preventDefault();
        e.stopPropagation();
        touchStartY = null;
        advanceToNextCard();
      } else if (delta < -20) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { passive: false });

    sectionEl.addEventListener('touchend', function () {
      touchStartY = null;
      gestureBlocked = false;
    }, { passive: true });
  }
})();
