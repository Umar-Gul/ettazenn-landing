// showcase-animation.js
//
// One-time, scroll-driven entrance sequence for app-showcase-section.
// Animation content/timings are unchanged from the previous version —
// only the locking behavior around it changed:
//
//   - Fires ONCE per page load. Once triggered (even if aborted early by
//     an upward scroll), it never triggers again.
//   - Downward scroll/swipe/arrow-key steps the animation forward one
//     beat at a time, same as before: 0 initial -> 1 morphed -> 2 settled
//     -> 3 swap1 -> 4 swap2. Page scroll stays locked the whole time.
//   - Upward scroll/swipe/arrow-key is ALWAYS free — it is never
//     intercepted, even mid-animation. It immediately releases the lock
//     and lets that same input scroll the page normally. There is no
//     reverse-stepping anymore.
//   - Reaching step 4 unlocks scroll and hands off to normal downward
//     page scroll, same as reaching it via an early upward release.

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

  // Timings (ms) — unchanged.
  const MORPH_DURATION       = 1800;
  const TEXT_DELAY           = 60;
  const COURSES_DELAY        = 90;
  const FOCUS_DELAY          = 120;
  const SETTLE_DURATION_ESTIMATE = 500;

  const SIDE_EXIT_DURATION   = 1400;
  const EMPTY_CARD_HOLD      = 500;
  const SIDE_ENTER_DURATION  = 1300;

  const LAST_STEP = 4;
  let currentStep = 0;
  let animating   = false;
  let phoneOnRight = true;
  let reducedMotionApplied = false;
  let hasPlayed = false; // one-time guard — set the moment capture begins

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
  // Layout helpers (unchanged)
  // ---------------------------------------------------------------------

 // showcase-animation.js — replace alignBadgesToPhone with this

function alignBadgesToPhone() {
  const cardRect = card.getBoundingClientRect();
  const textRect = textBlock.getBoundingClientRect();
  if (!cardRect.width || !textRect.width) return;

  // Courses: left-aligned with the text block's left edge (matches the
  // Figma reference — it floats directly above the heading's start, not
  // at a fixed % of the card).
  const coursesLeft = textRect.left - cardRect.left;
  badgeCourses.style.left = `${coursesLeft}px`;
  badgeCourses.style.right = 'auto';

  // Focus: right-aligned with the text block's right edge (paragraph's
  // wrap width) — floats below-right of the text, not at a fixed left offset.
  const focusRight = cardRect.right - textRect.right;
  badgeFocus.style.right = `${focusRight}px`;
  badgeFocus.style.left = 'auto';
}

function applyLayoutAlignment(isPhoneOnRight) {
  phoneBlock.style.left = desktopLayout.matches ? (isPhoneOnRight ? '10px' : '-10px') : '';
  textBlock.style.position = 'relative';
  textBlock.style.left = desktopLayout.matches ? (isPhoneOnRight ? '-18px' : '10px') : '';
  requestAnimationFrame(alignBadgesToPhone);
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

  // Upward input is always free — this clears any in-flight step timers
  // (so a pending timeout can't mutate styles after we've bailed) and
  // drops the lock, letting the triggering event scroll normally.
  function releaseUpward() {
    if (!scrollLocked) return;
    clearPendingTimers();
    animating = false;
    unlockScroll();
  }

  function onWheel(event) {
    if (event.deltaY < 0) {
      releaseUpward();
      return; // do not preventDefault — let this event scroll the page
    }
    if (Math.abs(event.deltaY) < 4) { event.preventDefault(); return; }
    handleStepInput(event);
  }

  let touchStartY = 0;
  let touchStepFired = false;

  function onTouchStart(event) {
    touchStartY = event.touches[0].clientY;
    touchStepFired = false;
  }

  function onTouchMove(event) {
    const delta = touchStartY - event.touches[0].clientY;

    if (delta < -10) { // swipe down = scrolling up = always free
      releaseUpward();
      return;
    }
    if (touchStepFired) { event.preventDefault(); return; }
    if (delta < 30) { event.preventDefault(); return; }
    touchStepFired = true;
    handleStepInput(event);
  }

  function onKeydown(event) {
    const tagName = event.target.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || event.target.isContentEditable) return;
    if (!scrollKeys.has(event.key)) return;

    if (event.key === 'ArrowUp' || event.key === 'PageUp') {
      releaseUpward();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
      handleStepInput(event);
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
  // Step transitions — unchanged from the previous version
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

  const FORWARD_TRANSITIONS = [stepForward0to1, stepForward1to2, toggleSide, toggleSide];

  async function advanceStep() {
    if (animating || currentStep >= LAST_STEP) return;
    animating = true;
    await FORWARD_TRANSITIONS[currentStep]();
    currentStep += 1;
    animating = false;
    if (currentStep === LAST_STEP) unlockScroll();
  }

  function handleStepInput(event) {
    if (animating) {
      event.preventDefault();
      return;
    }
    if (currentStep >= LAST_STEP) {
      unlockScroll(); // animation already finished — let this scroll the page
      return;
    }
    event.preventDefault();
    advanceStep();
  }

  // ---------------------------------------------------------------------
  // Initial arm — runs once at load. No mid-sequence reset anymore since
  // this is one-time only (no replay).
  // ---------------------------------------------------------------------

  function armInitialState() {
    clearPendingTimers();

    half.style.display = 'block';
    half.style.opacity = '1';
    half.style.transform = 'translate(-50%, 28%)';

    card.style.display = 'none';
    card.style.transition = 'none';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.97)';

    phoneImg.style.transition = 'none';
    phoneImg.style.opacity = '0';

    phoneOnRight = true;
    textBlock.style.order = '';
    phoneBlock.style.order = '';
    applyLayoutAlignment(phoneOnRight);
    textBlock.style.transition = 'none';
    phoneBlock.style.transition = 'none';
    textBlock.style.opacity = '0';
    textBlock.style.transform = 'translateX(24px)';
    phoneBlock.style.transform = 'none';

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
      phoneBlock.style.transition = '';
      badgeCourses.style.transition = '';
      badgeFocus.style.transition = '';
      halfImg.style.transition = '';
    });
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

  armInitialState();

  // ---------------------------------------------------------------------
  // Intersection observer — arms the one-time lock
  // ---------------------------------------------------------------------

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (reduceMotion) {
        if (entry.isIntersecting && !reducedMotionApplied) {
          reducedMotionApplied = true;
          hasPlayed = true;
          showFinalStateInstant();
          io.unobserve(section);
        }
        return;
      }

      if (entry.isIntersecting && entry.intersectionRatio > 0.5 && !hasPlayed) {
        hasPlayed = true; // consumed — this can never fire again
        lockScroll();
        io.unobserve(section);
      }
    });
  }, { threshold: [0, 0.5, 1] });

  io.observe(section);
})();