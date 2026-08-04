// showcase-animation.js
//
// Drives the entrance sequence for the app-showcase-section. Frame-by-frame
// review of the reference video showed this is NOT a crossfade between two
// separate phone images — it's one continuous phone that shrinks + slides
// into place (a shared-element / FLIP morph), then holds briefly on its
// own, then the glass card's chrome, text and badges pop in together.
//
// Measured beats from the video:
//   1. hold on the big hero phone
//   2. phone alone morphs (shrink + translate) into the card's phone slot  (~650ms)
//   3. brief pause — just the small phone, no card yet                     (~500ms)
//   4. card chrome + text + both badges fade/slide in together, fast       (~450ms)
//
// Step 2 is done with a real FLIP transform on the SAME <img> element used
// in stage-half-phone: we measure its current rect and the rect the
// matching image inside app-phone-block will occupy, then transition a
// translate+scale between them. At the very end we hand off invisibly to
// the real app-phone-block image (which is already sitting in its normal
// responsive layout position), so the whole thing stays responsive after
// landing instead of being locked to a snapshot.
//
// Relies on the transition-all duration-* classes already on
// stage-glass-card, app-text-block, badge-courses and badge-focus for the
// chrome/text/badge fades — only the phone morph gets its transition set
// explicitly here, since that's driven by JS-computed values.

(function () {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const section      = document.getElementById('app-showcase-section');
  const half         = document.getElementById('stage-half-phone');
  const halfImg      = half ? half.querySelector('img') : null;
  const card         = document.getElementById('stage-glass-card');
  const phoneBlock   = document.getElementById('app-phone-block');
  const phoneImg     = phoneBlock ? phoneBlock.querySelector('img') : null;
  const textBlock    = document.getElementById('app-text-block');
  const badgeCourses = document.getElementById('badge-courses');
  const badgeFocus   = document.getElementById('badge-focus');
  const desktopLayout = window.matchMedia('(min-width: 768px)');

  if (!section || !half || !halfImg || !card || !phoneBlock || !phoneImg || !textBlock || !badgeCourses || !badgeFocus) {
    console.warn('[showcase-animation] one or more expected elements were not found — check IDs.');
    return;
  }

  // Tune these to taste — proportions match the video, absolute values
  // compressed slightly since the video's ~4.4s opening hold is mostly
  // intro padding rather than an intended scroll-reveal delay.
  const HOLD_BEFORE_MORPH   = 1000; // reference: large phone holds before moving
  const MORPH_DURATION      = 1800; // reference: slow shared-phone shrink + slide
  const PAUSE_AFTER_MORPH   = 200;  // small phone briefly holds before card reveal
  const CHROME_FADE_DELAY   = 0;    // card bg/border starts as soon as the pause ends
  const TEXT_DELAY          = 60;
  const COURSES_DELAY       = 90;
  const FOCUS_DELAY         = 120;

  // Phase 5: move each element out of view, swap its flex order while
  // hidden, then bring it back from the opposite side.
  const SIDE_SWAP_HOLD      = 1400;
  const SIDE_EXIT_DURATION  = 1400;
  const EMPTY_CARD_HOLD     = 500;
  const SIDE_ENTER_DURATION = 1300;
  const MAX_SIDE_SWAPS      = 2;

  let sideSwapTimer = null;
  let sideSwapCount = 0;
  let phoneOnRight = true;
  let scrollLocked = false;
  let hasLockedOnce = false;
  let lockedScrollY = 0;
  let savedBodyOverflowY = '';
  let savedRootOverflowY = '';

  const scrollKeys = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

  function preventScroll(event) {
    event.preventDefault();
  }

  function preventScrollKey(event) {
    if (!scrollKeys.has(event.key)) return;
    const tagName = event.target.tagName;
    if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || event.target.isContentEditable) return;
    event.preventDefault();
  }

  function keepScrollPosition() {
    window.scrollTo(0, lockedScrollY);
  }

  function lockScroll() {
    if (scrollLocked || hasLockedOnce) return;
    scrollLocked = true;
    hasLockedOnce = true;
    lockedScrollY = window.scrollY;
    savedBodyOverflowY = document.body.style.overflowY;
    savedRootOverflowY = document.documentElement.style.overflowY;
    document.body.style.overflowY = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('keydown', preventScrollKey, { passive: false });
    window.addEventListener('scroll', keepScrollPosition, { passive: true });
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    document.body.style.overflowY = savedBodyOverflowY;
    document.documentElement.style.overflowY = savedRootOverflowY;
    window.removeEventListener('wheel', preventScroll);
    window.removeEventListener('touchmove', preventScroll);
    window.removeEventListener('keydown', preventScrollKey);
    window.removeEventListener('scroll', keepScrollPosition);
  }

  function alignBadgesToPhone(isSwapped) {
    if (!desktopLayout.matches) return;

    const cardRect = card.getBoundingClientRect();
    const phoneRect = phoneImg.getBoundingClientRect();
    if (!cardRect.width || !phoneRect.width) return;

    // Use the phone's actual side instead of the animation state so the final
    // landing frame always receives the right Figma anchors.
    const phoneIsOnRight = phoneRect.left + phoneRect.width / 2 > cardRect.left + cardRect.width / 2;

    if (phoneIsOnRight) {
      // Phone right (mobile3): both badges live on the left side of the card.
      badgeCourses.style.left = 'auto';
      badgeCourses.style.right = '43%';
      badgeFocus.style.left = '2rem';
      badgeFocus.style.right = 'auto';
    } else {
      // Phone left (mobile2): Courses is central and Focus is bottom-right.
      badgeCourses.style.right = 'auto';
      badgeCourses.style.left = 'auto';
      badgeCourses.style.right = '43%';
      badgeFocus.style.left = 'auto';
      badgeFocus.style.right = '1.25rem';
    }
  }

  // Small desktop landing corrections measured against the reference frame.
  // `left` preserves the flex layout and remains independent of the
  // transform used by the animation itself.
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
    // A second frame ensures flex-order changes have been laid out first.
    requestAnimationFrame(() => alignBadgesToPhone(isPhoneOnRight));
  }

  desktopLayout.addEventListener('change', () => {
    applyLayoutAlignment(phoneOnRight);
  });

  function swapSides() {
    const phoneIsOnRight = phoneOnRight;
    const easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
    const travel = Math.ceil(card.getBoundingClientRect().width * 1.15);

    const exitPhoneX = phoneIsOnRight ? travel : -travel;
    const exitTextX = phoneIsOnRight ? -travel : travel;

    // Exit from the current side so the two blocks never overlap.
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
      // Change sides only while both elements are invisible.
      phoneBlock.style.transition = 'none';
      textBlock.style.transition = 'none';
      phoneOnRight = !phoneIsOnRight;
      textBlock.style.order = phoneOnRight ? '' : '2';
      phoneBlock.style.order = phoneOnRight ? '' : '1';
      // Both elements are hidden here. Clear the exit translation before
      // measuring the new layout, otherwise the badge can be positioned
      // from the phone's off-screen rect on the final swap.
      phoneBlock.style.transform = 'none';
      textBlock.style.transform = 'none';
      applyLayoutAlignment(phoneOnRight);

      sideSwapTimer = setTimeout(() => {
        // Enter from the outside edge of the new side.
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

        sideSwapTimer = setTimeout(() => {
          sideSwapCount += 1;
          scheduleSideSwap();
          if (sideSwapCount === MAX_SIDE_SWAPS) unlockScroll();
        }, SIDE_ENTER_DURATION);
      }, EMPTY_CARD_HOLD);
    }, SIDE_EXIT_DURATION);
  }

  function scheduleSideSwap() {
    clearTimeout(sideSwapTimer);
    if (sideSwapCount >= MAX_SIDE_SWAPS) return;
    sideSwapTimer = setTimeout(() => {
      swapSides();
    }, SIDE_SWAP_HOLD);
  }

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

    // restore transitions next frame so the above resets don't animate
    requestAnimationFrame(() => {
      card.style.transition = '';
      phoneImg.style.transition = '';
      textBlock.style.transition = '';
      badgeCourses.style.transition = '';
      badgeFocus.style.transition = '';
    });
  }

  function reset() {
    clearTimeout(sideSwapTimer);
    sideSwapCount = 0;
    unlockScroll();

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

  // Measures where phoneImg will render (inside the still-hidden card)
  // without flashing it on screen: display:block + visibility:hidden keeps
  // it in normal layout flow so getBoundingClientRect is accurate, but
  // nothing is painted.
  function measureTargetRect() {
    const prevDisplay = card.style.display;
    const prevVisibility = card.style.visibility;

    card.style.transition = 'none';
    card.style.display = 'block';
    card.style.visibility = 'hidden';
    void card.offsetHeight; // force reflow

    const rect = phoneImg.getBoundingClientRect();

    card.style.display = prevDisplay;
    card.style.visibility = prevVisibility;
    requestAnimationFrame(() => { card.style.transition = ''; });

    return rect;
  }

  function playSequence() {
    if (reduceMotion) {
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
      return;
    }

    lockScroll();

    setTimeout(() => {
      // --- Phase 2: morph the SAME phone image from its hero rect to the
      // card's phone-slot rect. Card itself is still fully hidden.
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

      setTimeout(() => {
        // --- Phase 3/4: hand off to the real (responsive) phone image,
        // then after the pause, fade in card chrome + text + badges.
        phoneImg.style.transition = 'opacity 120ms linear';
        card.style.display = 'block';
        applyLayoutAlignment(phoneOnRight);
        requestAnimationFrame(() => { phoneImg.style.opacity = '1'; });
        half.style.display = 'none';

        setTimeout(() => {
          requestAnimationFrame(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          });
          setTimeout(() => {
            textBlock.style.opacity = '1';
            textBlock.style.transform = 'translateX(0)';
          }, TEXT_DELAY);
          setTimeout(() => {
            badgeCourses.style.opacity = '1';
            badgeCourses.style.transform = 'translateY(0)';
          }, COURSES_DELAY);
          setTimeout(() => {
            badgeFocus.style.opacity = '1';
            badgeFocus.style.transform = 'translateY(0)';
          }, FOCUS_DELAY);

          // once everything has settled, start the side-swap loop
          scheduleSideSwap();
        }, PAUSE_AFTER_MORPH + CHROME_FADE_DELAY);
      }, MORPH_DURATION);
    }, HOLD_BEFORE_MORPH);
  }

  reset();

  let played = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        if (!played) {
          played = true;
          playSequence();
        }
      } else if (!entry.isIntersecting) {
        played = false;
        reset();
      }
    });
  }, { threshold: [0, 0.5, 1] });

  io.observe(section);
})();
