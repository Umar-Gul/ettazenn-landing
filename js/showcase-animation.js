// showcase-animation.js
//
// Scroll/step-driven entrance sequence for app-showcase-section, replacing
// the old timer-based autoplay. The section pins (page scroll locked) once
// it's ~50% in view, and each wheel tick / swipe / arrow-key press advances
// or retreats ONE beat:
//
//   0 initial  -> 1 morphed -> 2 settled -> 3 swap1 -> 4 swap2
//
// Scrolling further forward at step 4, or backward at step 0, releases the
// lock and lets that same input event pass through as normal page scroll.
//
// State 1 (morphed): the big hero phone (a real <img>, #stage-half-phone)
// shrink+slides via a FLIP transform into the card's phone slot, then hands
// off to the real #app-phone-block image so layout stays responsive.
// State 2 (settled): the glass card chrome + text + both badges fade in.
// States 3/4 (swap1/swap2): phoneOnRight flips. Because a flip is its own
// inverse, moving 2->3, 4->3, or 3->2/3->4 all call the exact same
// toggleSide() — direction doesn't change what the animation looks like.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const section       = document.getElementById('app-showcase-section');
  const half          = document.getElementById('stage-half-phone');
  const halfImg       = half ? half.querySelector('img') : null;
  const card          = document.getElementById('stage-glass-card');
  const phoneBlock    = document.getElementById('app-phone-block');
  const phoneImg      = phoneBlock ? phoneBlock.querySelector('img') : null;
  const textBlock     = document.getElementById('app-text-block');
  const badgeCourses  = document.getElementById('badge-courses');
  const badgeFocus    = document.getElementById('badge-focus');
  const desktopLayout = window.matchMedia('(min-width: 768px)');

  if (!section || !half || !halfImg || !card || !phoneBlock || !phoneImg || !textBlock || !badgeCourses || !badgeFocus) {
    console.warn('[showcase-animation] one or more expected elements were not found — check IDs.');
    return;
  }

  // Timings (ms) — proportions kept from the original reference video.
  const MORPH_DURATION       = 1800; // shared-phone shrink + slide
  const TEXT_DELAY           = 60;
  const COURSES_DELAY        = 90;
  const FOCUS_DELAY          = 120;
  // Card/text/badge fades themselves are governed by the transition-all
  // duration-* Tailwind classes already on those elements in the HTML — we
  // don't own that duration here, so this is just a safe estimate of how
  // long to wait before allowing the next input, so a quick second scroll
  // can't interrupt a still-fading element. Bump this if that Tailwind
  // duration is longer than ~500ms.
  const SETTLE_DURATION_ESTIMATE = 500;

  const SIDE_EXIT_DURATION   = 1400;
  const EMPTY_CARD_HOLD      = 500;
  const SIDE_ENTER_DURATION  = 1300;

  const LAST_STEP = 4;
  let currentStep = 0;
  let animating   = false;
  let phoneOnRight = true;
  let reducedMotionApplied = false;

  let scrollLocked = false;
  let lockedScrollY = 0;
  let savedBodyOverflowY = '';
  let savedRootOverflowY = '';
  let sideSwapTimer = null;
  const pendingTimers = [];

  function track(id) { pendingTimers.push(id); return id; }
  function clearPendingTimers() {
    pendingTimers.forEach(clearTimeout);
    pendingTimers.length = 0;
    clearTimeout(sideSwapTimer);
  }

  // ---------------------------------------------------------------------
  // Layout helpers (unchanged from original)
  // ---------------------------------------------------------------------

  function alignBadgesToPhone(isSwapped) {
    if (!desktopLayout.matches) return;

    const cardRect = card.getBoundingClientRect();
    const phoneRect = phoneImg.getBoundingClientRect();
    if (!cardRect.width || !phoneRect.width) return;

    const phoneIsOnRight = phoneRect.left + phoneRect.width / 2 > cardRect.left + cardRect.width / 2;

    if (phoneIsOnRight) {
      badgeCourses.style.left = 'auto';
      badgeCourses.style.right = '43%';
      badgeFocus.style.left = '2rem';
      badgeFocus.style.right = 'auto';
    } else {
      badgeCourses.style.right = 'auto';
      badgeCourses.style.left = 'auto';
      badgeCourses.style.right = '43%';
      badgeFocus.style.left = 'auto';
      badgeFocus.style.right = '1.25rem';
    }
  }

  function applyLayoutAlignment(isPhoneOnRight) {
    if (!desktopLayout.matches) {
      phoneBlock.style.left = '';
      textBlock.style.position = '';
      textBlock.style.left = '';
      badgeCourses.style.right = '';
      badgeFocus.style.left = '';
      badgeFocus.style.right = '';
      return;
    }

    phoneBlock.style.left = isPhoneOnRight ? '10px' : '-10px';
    textBlock.style.position = 'relative';
    textBlock.style.left = isPhoneOnRight ? '-18px' : '10px';
    requestAnimationFrame(() => alignBadgesToPhone(isPhoneOnRight));
  }

  desktopLayout.addEventListener('change', () => {
    applyLayoutAlignment(phoneOnRight);
  });

  function measureTargetRect() {
    const prevDisplay = card.style.display;
    const prevVisibility = card.style.visibility;

    card.style.transition = 'none';
    card.style.display = 'block';
    card.style.visibility = 'hidden';
    void card.offsetHeight;

    const rect = phoneImg.getBoundingClientRect();

    card.style.display = prevDisplay;
    card.style.visibility = prevVisibility;
    requestAnimationFrame(() => { card.style.transition = ''; });

    return rect;
  }

  // ---------------------------------------------------------------------
  // Scroll locking
  // ---------------------------------------------------------------------

  const scrollKeys = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

  function keepScrollPosition() {
    window.scrollTo(0, lockedScrollY);
  }

  function onWheel(event) {
    if (Math.abs(event.deltaY) < 4) { event.preventDefault(); return; }
    handleStepInput(event.deltaY > 0 ? 'forward' : 'backward', event);
  }

  let touchStartY = 0;
  let touchStepFired = false;

  function onTouchStart(event) {
    touchStartY = event.touches[0].clientY;
    touchStepFired = false;
  }

  function onTouchMove(event) {
    if (touchStepFired) { event.preventDefault(); return; }
    const delta = touchStartY - event.touches[0].clientY;
    if (Math.abs(delta) < 30) { event.preventDefault(); return; }
    touchStepFired = true;
    handleStepInput(delta > 0 ? 'forward' : 'backward', event);
  }

  function onKeydown(event) {
    const tagName = event.target.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || event.target.isContentEditable) return;
    if (!scrollKeys.has(event.key)) return;

    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      handleStepInput('forward', event);
    } else if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      handleStepInput('backward', event);
    } else {
      event.preventDefault(); // swallow Home/End while locked
    }
  }

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    lockedScrollY = window.scrollY;
    savedBodyOverflowY = document.body.style.overflowY;
    savedRootOverflowY = document.documentElement.style.overflowY;
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKeydown, { passive: false });
    window.addEventListener('scroll', keepScrollPosition, { passive: true });
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    document.body.style.overflowY = savedBodyOverflowY;
    document.documentElement.style.overflowY = savedRootOverflowY;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', keepScrollPosition);
  }

  // ---------------------------------------------------------------------
  // Step transitions
  // ---------------------------------------------------------------------

  function stepForward0to1() {
    return new Promise((resolve) => {
      const startRect = halfImg.getBoundingClientRect();
      const endRect = measureTargetRect();

      const dx = endRect.left - startRect.left;
      const dy = endRect.top - startRect.top;
      const scale = endRect.width / startRect.width;

      halfImg.style.transformOrigin = 'top left';
      halfImg.style.transition = `transform ${MORPH_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      requestAnimationFrame(() => {
        halfImg.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      });

      track(setTimeout(() => {
        phoneImg.style.transition = 'opacity 120ms linear';
        card.style.display = 'block';
        applyLayoutAlignment(phoneOnRight);
        requestAnimationFrame(() => { phoneImg.style.opacity = '1'; });
        half.style.display = 'none';
        resolve();
      }, MORPH_DURATION));
    });
  }

  function stepBackward1to0() {
    return new Promise((resolve) => {
      const currentRect = phoneImg.getBoundingClientRect();

      half.style.display = 'block';
      half.style.opacity = '1';
      halfImg.style.transition = 'none';
      halfImg.style.transformOrigin = 'top left';
      halfImg.style.transform = 'none';
      void halfImg.offsetWidth;
      const naturalRect = halfImg.getBoundingClientRect();

      const dx = currentRect.left - naturalRect.left;
      const dy = currentRect.top - naturalRect.top;
      const scale = currentRect.width / naturalRect.width;
      halfImg.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      void halfImg.offsetWidth;

      phoneImg.style.transition = 'none';
      phoneImg.style.opacity = '0';
      card.style.display = 'none';

      halfImg.style.transition = `transform ${MORPH_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      requestAnimationFrame(() => {
        halfImg.style.transform = 'none';
      });

      track(setTimeout(resolve, MORPH_DURATION));
    });
  }

  function stepForward1to2() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
      });
      track(setTimeout(() => {
        textBlock.style.opacity = '1';
        textBlock.style.transform = 'translateX(0)';
      }, TEXT_DELAY));
      track(setTimeout(() => {
        badgeCourses.style.opacity = '1';
        badgeCourses.style.transform = 'translateY(0)';
      }, COURSES_DELAY));
      track(setTimeout(() => {
        badgeFocus.style.opacity = '1';
        badgeFocus.style.transform = 'translateY(0)';
      }, FOCUS_DELAY));
      track(setTimeout(resolve, FOCUS_DELAY + SETTLE_DURATION_ESTIMATE));
    });
  }

  function stepBackward2to1() {
    return new Promise((resolve) => {
      badgeFocus.style.opacity = '0';
      badgeFocus.style.transform = 'translateY(18px)';
      badgeCourses.style.opacity = '0';
      badgeCourses.style.transform = 'translateY(-18px)';
      track(setTimeout(() => {
        textBlock.style.opacity = '0';
        textBlock.style.transform = 'translateX(24px)';
      }, TEXT_DELAY));
      track(setTimeout(() => {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.97)';
      }, TEXT_DELAY + COURSES_DELAY));
      track(setTimeout(resolve, TEXT_DELAY + COURSES_DELAY + SETTLE_DURATION_ESTIMATE));
    });
  }

  // Symmetric flip — used for BOTH directions between steps 2/3 and 3/4.
  function toggleSide() {
    return new Promise((resolve) => {
      const phoneIsOnRight = phoneOnRight;
      const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
      const travel = Math.ceil(card.getBoundingClientRect().width * 1.15);

      const exitPhoneX = phoneIsOnRight ? travel : -travel;
      const exitTextX = phoneIsOnRight ? -travel : travel;

      phoneBlock.style.transition = `transform ${SIDE_EXIT_DURATION}ms ${easing}, opacity ${SIDE_EXIT_DURATION}ms ease-out`;
      textBlock.style.transition = `transform ${SIDE_EXIT_DURATION}ms ${easing}, opacity ${SIDE_EXIT_DURATION}ms ease-out`;
      phoneBlock.style.transform = `translateX(${exitPhoneX}px)`;
      phoneBlock.style.opacity = '0';
      textBlock.style.transform = `translateX(${exitTextX}px)`;
      textBlock.style.opacity = '0';
      badgeCourses.style.transition = `transform ${SIDE_EXIT_DURATION}ms ${easing}, opacity ${SIDE_EXIT_DURATION}ms ease-out`;
      badgeFocus.style.transition = `transform ${SIDE_EXIT_DURATION}ms ${easing}, opacity ${SIDE_EXIT_DURATION}ms ease-out`;
      badgeCourses.style.transform = 'translateY(-28px)';
      badgeCourses.style.opacity = '0';
      badgeFocus.style.transform = 'translateY(28px)';
      badgeFocus.style.opacity = '0';

      sideSwapTimer = setTimeout(() => {
        phoneBlock.style.transition = 'none';
        textBlock.style.transition = 'none';
        phoneOnRight = !phoneIsOnRight;
        textBlock.style.order = phoneOnRight ? '' : '2';
        phoneBlock.style.order = phoneOnRight ? '' : '1';
        phoneBlock.style.transform = 'none';
        textBlock.style.transform = 'none';
        applyLayoutAlignment(phoneOnRight);

        sideSwapTimer = setTimeout(() => {
          const enterPhoneX = phoneOnRight ? travel : -travel;
          const enterTextX = phoneOnRight ? -travel : travel;
          phoneBlock.style.transform = `translateX(${enterPhoneX}px)`;
          textBlock.style.transform = `translateX(${enterTextX}px)`;
          badgeCourses.style.transition = 'none';
          badgeFocus.style.transition = 'none';
          badgeCourses.style.transform = 'translateY(-18px)';
          badgeFocus.style.transform = 'translateY(18px)';
          void phoneBlock.offsetWidth;

          requestAnimationFrame(() => {
            phoneBlock.style.transition = `transform ${SIDE_ENTER_DURATION}ms ${easing}, opacity ${SIDE_ENTER_DURATION}ms ease-out`;
            textBlock.style.transition = `transform ${SIDE_ENTER_DURATION}ms ${easing}, opacity ${SIDE_ENTER_DURATION}ms ease-out`;
            badgeCourses.style.transition = `transform ${SIDE_ENTER_DURATION}ms ${easing}, opacity ${SIDE_ENTER_DURATION}ms ease-out`;
            badgeFocus.style.transition = `transform ${SIDE_ENTER_DURATION}ms ${easing}, opacity ${SIDE_ENTER_DURATION}ms ease-out`;
            phoneBlock.style.transform = 'translateX(0)';
            phoneBlock.style.opacity = '1';
            textBlock.style.transform = 'translateX(0)';
            textBlock.style.opacity = '1';
            badgeCourses.style.transform = 'translateY(0)';
            badgeCourses.style.opacity = '1';
            badgeFocus.style.transform = 'translateY(0)';
            badgeFocus.style.opacity = '1';
          });

          sideSwapTimer = setTimeout(resolve, SIDE_ENTER_DURATION);
        }, EMPTY_CARD_HOLD);
      }, SIDE_EXIT_DURATION);
    });
  }

  const FORWARD_TRANSITIONS  = [stepForward0to1, stepForward1to2, toggleSide, toggleSide];
  const BACKWARD_TRANSITIONS = [null, stepBackward1to0, stepBackward2to1, toggleSide, toggleSide];

  async function advanceStep(direction) {
    if (animating) return;

    if (direction === 'forward') {
      if (currentStep >= LAST_STEP) return;
      animating = true;
      await FORWARD_TRANSITIONS[currentStep]();
      currentStep += 1;
      animating = false;
      if (currentStep === LAST_STEP) unlockScroll();
    } else {
      if (currentStep <= 0) return;
      animating = true;
      await BACKWARD_TRANSITIONS[currentStep]();
      currentStep -= 1;
      animating = false;
      if (currentStep === 0) unlockScroll();
    }
  }

  function handleStepInput(direction, event) {
    if (animating) {
      event.preventDefault();
      return;
    }
    if (direction === 'forward' && currentStep >= LAST_STEP) {
      unlockScroll(); // let this event scroll the page past the section
      return;
    }
    if (direction === 'backward' && currentStep <= 0) {
      unlockScroll(); // let this event scroll the page above the section
      return;
    }
    event.preventDefault();
    advanceStep(direction);
  }

  // ---------------------------------------------------------------------
  // Hard reset — instant, no animation. Used when the section is scrolled
  // away from mid-sequence, or on first load.
  // ---------------------------------------------------------------------

  function armCardChildren() {
    card.style.transition = 'none';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.97)';

    phoneImg.style.transition = 'none';
    phoneImg.style.opacity = '0';

    textBlock.style.transition = 'none';
    textBlock.style.opacity = '0';
    textBlock.style.transform = 'translateX(24px)';

    badgeCourses.style.transition = 'none';
    badgeCourses.style.opacity = '0';
    badgeCourses.style.transform = 'translateY(-18px)';

    badgeFocus.style.transition = 'none';
    badgeFocus.style.opacity = '0';
    badgeFocus.style.transform = 'translateY(18px)';

    halfImg.style.transition = 'none';
    halfImg.style.transform = 'none';

    requestAnimationFrame(() => {
      card.style.transition = '';
      phoneImg.style.transition = '';
      textBlock.style.transition = '';
      badgeCourses.style.transition = '';
      badgeFocus.style.transition = '';
    });
  }

  function resetToStep0() {
    clearPendingTimers();
    animating = false;
    currentStep = 0;

    half.style.display = 'block';
    half.style.opacity = '1';
    half.style.transform = 'translate(-50%, 28%)';

    card.style.display = 'none';

    phoneOnRight = true;
    textBlock.style.order = '';
    phoneBlock.style.order = '';
    applyLayoutAlignment(phoneOnRight);
    textBlock.style.transition = 'none';
    phoneBlock.style.transition = 'none';
    textBlock.style.transform = 'translateX(24px)';
    phoneBlock.style.transform = 'none';
    requestAnimationFrame(() => {
      textBlock.style.transition = '';
      phoneBlock.style.transition = '';
    });

    armCardChildren();
  }

  function showFinalStateInstant() {
    half.style.display = 'none';
    card.style.display = 'block';
    card.style.opacity = '1';
    card.style.transform = 'scale(1)';
    phoneImg.style.opacity = '1';
    textBlock.style.opacity = '1';
    textBlock.style.transform = 'translateX(0)';
    badgeCourses.style.opacity = '1';
    badgeCourses.style.transform = 'translateY(0)';
    badgeFocus.style.opacity = '1';
    badgeFocus.style.transform = 'translateY(0)';
  }

  resetToStep0();

  // ---------------------------------------------------------------------
  // Intersection observer — arms/disarms the scroll lock
  // ---------------------------------------------------------------------

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (reduceMotion) {
        if (entry.isIntersecting && !reducedMotionApplied) {
          reducedMotionApplied = true;
          showFinalStateInstant();
        }
        return;
      }

      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        lockScroll();
      } else if (!entry.isIntersecting) {
        if (currentStep > 0 && currentStep < LAST_STEP) {
          resetToStep0(); // left mid-sequence — snap back for next time
        }
        unlockScroll();
      }
    });
  }, { threshold: [0, 0.5, 1] });

  io.observe(section);
})();