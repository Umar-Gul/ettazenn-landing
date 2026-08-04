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
    autoplay: reducedMotion ? false : {
      delay: 4800,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
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

  if (sectionEl && typeof IntersectionObserver !== 'undefined') {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
      });
    }, { threshold: [0, 0.6, 1] });
    sectionObserver.observe(sectionEl);

    sectionEl.addEventListener('wheel', function (e) {
      if (!sectionActive) return;

      var atLast = wisdomSwiper.isEnd;
      var atFirst = wisdomSwiper.isBeginning;

      if (e.deltaY > 0 && !atLast) {
        e.preventDefault();
        if (!wheelCooldown) {
          wheelCooldown = true;
          wisdomSwiper.slideNext();
          window.setTimeout(function () { wheelCooldown = false; }, 550);
        }
      } else if (e.deltaY < 0 && !atFirst) {
        e.preventDefault();
        if (!wheelCooldown) {
          wheelCooldown = true;
          wisdomSwiper.slidePrev();
          window.setTimeout(function () { wheelCooldown = false; }, 550);
        }
      }
      // else: already at the boundary card in this direction - let the event
      // through so the page can scroll to the next/previous section.
    }, { passive: false });
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
    if (nameEl) nameEl.textContent = center.name;
    if (starsEl) starsEl.innerHTML = starsHtml(center.rating);
    if (ratingNumEl) ratingNumEl.textContent = center.rating.toFixed(1);
    if (bioEl) bioEl.textContent = center.bio;

    if (leftImg) { leftImg.src = left.avatar; leftImg.alt = left.name; }
    if (leftRating) leftRating.innerHTML = Math.round(left.rating) + '<span class="text-amber-400">★</span>';

    if (rightImg) { rightImg.src = right.avatar; rightImg.alt = right.name; }
    if (rightRating) rightRating.innerHTML = Math.round(right.rating) + '<span class="text-amber-400">★</span>';
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

    // Hide originals while clones fly
    avatar.style.visibility = "hidden";

    if (incomingWrap)
      incomingWrap.style.visibility = "hidden";

    // Fade text
    if (content) {

      content.style.transition = "opacity .25s ease";
      content.style.opacity = "0";

    }

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

      avatar.style.visibility = "";

      if (incomingWrap)
        incomingWrap.style.visibility = "";

      if (content)
        content.style.opacity = "1";

    }, TOTAL_TIME / 2);

    // Finish
    setTimeout(function () {

      animating = false;

    }, TOTAL_TIME);

  }

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
      bg: 'linear-gradient(135deg, #43336B 0%, #2F2154 100%)'
    },
    {
      title: "Gym & Wellness<br />Center's.",
      desc: 'Master the ancient arts with modern instruction.<br class="hidden sm:inline" />From deep-flow Yoga to the moving meditation of minds.',
      icon: 'images/gym-main.svg',
      badgeIcon: 'images/gym-badge.png',
      alt: 'Gym Icon',
      bg: 'linear-gradient(135deg, #2D273A 0%, #1D1828 100%)'
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
      bg: 'linear-gradient(135deg, #2C263A 0%, #1E1A2B 100%)'
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

  if (sectionEl && typeof IntersectionObserver !== 'undefined') {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        sectionActive = entry.isIntersecting && entry.intersectionRatio > 0.6;
        updateScrollLock();
      });
    }, { threshold: [0, 0.6, 1] });
    sectionObserver.observe(sectionEl);

    sectionEl.addEventListener('wheel', function (e) {
      if (!sectionActive || animating) return;

      var delta = e.deltaY;
      var atLast = index === categories.length - 1;
      var atFirst = index === 0;

      if (delta > 0) {
        if (atLast) {
          firstVisitLocked = false;
          setScrollLock(false);
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (!wheelCooldown) {
          wheelCooldown = true;
          goTo(index + 1);
          window.setTimeout(function () { wheelCooldown = false; }, SWAP_DELAY + 120);
        }
      } else if (delta < 0) {
        if (atFirst) {
          firstVisitLocked = false;
          setScrollLock(false);
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (!wheelCooldown) {
          wheelCooldown = true;
          goTo(index - 1);
          window.setTimeout(function () { wheelCooldown = false; }, SWAP_DELAY + 120);
        }
      }
    }, { passive: false });

    sectionEl.addEventListener('touchmove', function (e) {
      if (sectionActive && index < categories.length - 1) {
        e.preventDefault();
      }
    }, { passive: false });
  }
})();

// document.addEventListener("DOMContentLoaded", () => {
//   const halfPhone = document.getElementById("stage-half-phone");
//   const glassCard = document.getElementById("stage-glass-card");
//   const showcaseContainer = document.getElementById("app-showcase-container");
//   const section = document.getElementById("app-showcase-section");

//   if (!halfPhone || !glassCard || !showcaseContainer) return;

//   // Helper delay function
//   const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  

//   async function runShowcaseSequence() {
//     // 1. Explicitly ensure Stage 1 (Half Phone) is visible on load
//     halfPhone.style.display = "block";
//     halfPhone.style.opacity = "1";
//     halfPhone.style.transform = "translate(-50%, 28%)";

//     glassCard.style.display = "none";
//     glassCard.style.opacity = "0";

//     // 2. Hold half-phone visible for 2 seconds
//     await sleep(2000);

//     // 3. Start fade-down animation of half-phone
//     halfPhone.style.opacity = "0";
//     halfPhone.style.transform = "translate(-50%, 45%)";

//     // 4. Wait for the 700ms transition to complete, then remove from flow
//     await sleep(700);
//     halfPhone.style.display = "none";

//     // 5. Reveal Stage 2 (Glass Card)
//     glassCard.style.display = "block";

//     // Tiny frame delay so the browser registers display: block before animating opacity
//     await sleep(50);
//     glassCard.style.opacity = "1";
//     glassCard.style.transform = "scale(1)";

//     // 6. Start side-swapping loop
//     startSideSwapSequence();
//   }

//   function startSideSwapSequence() {
//     let isSwapped = false;

//     const phoneBlock = document.getElementById("app-phone-block");
//     const textBlock = document.getElementById("app-text-block");
//     const coursesBadge = document.getElementById("badge-courses");
//     const focusBadge = document.getElementById("badge-focus");
//     if (!phoneBlock || !textBlock || !coursesBadge || !focusBadge) return;

//     const SOFT_CLASSES = [
//       "soft-exit-left", "soft-exit-right",
//       "soft-enter-left", "soft-enter-right",
//       "soft-badge-out", "soft-badge-in",
//     ];
//     const clearSoft = (el) => el.classList.remove(...SOFT_CLASSES);

//     setInterval(() => {
//       // Phone and text fade + drift toward opposite sides, then ease back in
//       // from their new sides; badges fade + scale on the same beat.
//       const goingReverse = !isSwapped;
//       const phoneExit = goingReverse ? "soft-exit-right" : "soft-exit-left";
//       const textExit = goingReverse ? "soft-exit-left" : "soft-exit-right";
//       const phoneEnter = goingReverse ? "soft-enter-left" : "soft-enter-right";
//       const textEnter = goingReverse ? "soft-enter-right" : "soft-enter-left";

//       [phoneBlock, textBlock, coursesBadge, focusBadge].forEach(clearSoft);
//       void phoneBlock.offsetWidth; // restart animations cleanly

//       phoneBlock.classList.add(phoneExit);
//       textBlock.classList.add(textExit);
//       coursesBadge.classList.add("soft-badge-out");
//       focusBadge.classList.add("soft-badge-out");

//       setTimeout(() => {
//         if (goingReverse) {
//           showcaseContainer.classList.remove("md:flex-row");
//           showcaseContainer.classList.add("md:flex-row-reverse");
//         } else {
//           showcaseContainer.classList.remove("md:flex-row-reverse");
//           showcaseContainer.classList.add("md:flex-row");
//         }
//         glassCard.classList.toggle("badges-swapped", goingReverse);
//         isSwapped = !isSwapped;

//         [phoneBlock, textBlock, coursesBadge, focusBadge].forEach(clearSoft);
//         void phoneBlock.offsetWidth;

//         phoneBlock.classList.add(phoneEnter);
//         textBlock.classList.add(textEnter);
//         coursesBadge.classList.add("soft-badge-in");
//         focusBadge.classList.add("soft-badge-in");
//       }, 260); // matches the soft-exit animation duration
//     }, 3500);
//   }

//   // Start the sequence only once this section actually scrolls into view,
//   // not unconditionally at page load. The section sits behind Courses (which
//   // has its own scroll-hijack requiring several gestures) and Crazy Features,
//   // so a page-load-timed sequence can finish entirely before the user ever
//   // scrolls this far - they'd land on the already-swapped glass card and
//   // never see the half-phone hold at all.
//   if (section && typeof IntersectionObserver !== "undefined") {
//     let started = false;
//     const sectionObserver = new IntersectionObserver((entries) => {
//       entries.forEach((entry) => {
//         if (entry.isIntersecting && !started) {
//           started = true;
//           runShowcaseSequence();
//           sectionObserver.unobserve(section);
//         }
//       });
//     }, { threshold: 0.5 });
//     sectionObserver.observe(section);
//   } else {
//     runShowcaseSequence();
//   }
// });
