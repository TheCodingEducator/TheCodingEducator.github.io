    const state = {
      mode: 'title',
      difficulty: '1-step',
      levelIndex: 0,
      leftState: { variables: 0, constants: 0, groups: null },
      rightState: { variables: 0, constants: 0, groups: null },
      initialLeft: { variables: 0, constants: 0, groups: null },
      initialRight: { variables: 0, constants: 0, groups: null },
      xValue: 5,
      history: [],
      isWin: false,
      message: '',
      seenEquations: new Set(),
      pendingDivisor: null
    };

    const VAR_COLOR = '#2563eb';
    const CONST_COLOR = '#f97316';

    // Fixed reference footprint for sandbox mode's fitScale() - measured
    // once from the scale's own static frame (pivot/beam/platforms) with
    // no tiles on either pan. See fitScale() for why sandbox uses this
    // instead of measuring live tile content.
    const SANDBOX_REF = { halfW: 293, up: 260, down: -88 };

    // Global Keydown Listener for Hotkeys (Space/Enter -> Submit/Next Level)
    document.addEventListener('keydown', (event) => {
        if (window.isPageControlKey && window.isPageControlKey(event)) return;   // keys for the page's own controls (All games, Fullscreen, notes...)
        if (event.key === 'Escape') {
            if (!document.getElementById('exit-confirm-layer').classList.contains('hidden')) {
                cancelExitConfirm();
            } else if (state.mode === 'challenge' || state.mode === 'sandbox') {
                requestModeChange(state.mode === 'challenge' ? 'difficulty' : 'title');
            }
            return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
            if (state.mode === 'challenge') {
                if (state.pendingDivisor !== null) return; // Do not trigger if Warning Modal is visible

                // Do not hijack the event if user is actively tabbing through and pressing native buttons
                if (event.target.tagName !== 'BUTTON') {
                    event.preventDefault(); // Prevent default page scroll on Space or form submit on Enter
                    if (state.isWin) {
                        nextLevel();
                    } else {
                        submitAnswer();
                    }
                }
            }
        }
    });

    function cloneSide(s) { return { variables: s.variables, constants: s.constants, groups: s.groups ? { ...s.groups } : null }; }

    function cleanFloat(f) {
        return Math.round(f * 60) / 60;
    }

    function isInt(val) {
        return Math.abs(val - Math.round(val)) < 0.001;
    }

    function getGcd(a, b) {
        a = Math.abs(a); b = Math.abs(b);
        if (a === 0 && b === 0) return 1;
        if (a === 0) return b;
        if (b === 0) return a;
        while (b) { let temp = b; b = a % b; a = temp; }
        return a;
    }

    function getFactor(s) {
        if (s.groups !== null) return 1;
        if (!isInt(s.variables) || !isInt(s.constants)) return 1;
        if (Math.abs(s.variables) === 0 || Math.abs(s.constants) === 0) return 1;
        return getGcd(Math.round(s.variables), Math.round(s.constants));
    }

    function cleanGroups(s) {
        // Only shed the parenthesis if the multiplier drops to 1 or -1
        if (s.groups && Math.abs(s.groups.count) === 1) {
            s.variables = cleanFloat(s.variables + s.groups.count * s.groups.variables);
            s.constants = cleanFloat(s.constants + s.groups.count * s.groups.constants);
            s.groups = null;
        }
    }

    function showMessage(msg) {
      state.message = msg;
      updateUI();
      setTimeout(() => { if(state.message === msg) { state.message = ''; updateUI(); } }, 5000);
    }

    function fitScale() {
      if (state.mode !== 'challenge' && state.mode !== 'sandbox') return;
      const wrapper = document.getElementById('scale-wrapper');
      const container = document.getElementById('scale-container');
      if (!wrapper || !container) return;

      // Clamped to a small positive floor rather than bailing out - on an
      // extreme viewport (e.g. sandbox mode's side panels leaving no room
      // on a very short landscape window) clientHeight/Width can genuinely
      // hit 0, and returning early would leave the container with whatever
      // transform it last had (often none at all, i.e. its full natural
      // 440x280 size) - a far worse collision than a very small scale.
      let availableHeight = Math.max(wrapper.clientHeight, 1);
      let availableWidth = Math.max(wrapper.clientWidth - 12, 1);

      // Measure the container's TRUE unscaled content footprint instead of
      // assuming the nominal 440x280 artwork box. Balloons/tiles/grouped-
      // parenthesis stacks (e.g. several terms piled on one pan) render
      // well outside that box, so fitting against the fixed size let real
      // content spill past the wrapper's edges - this is what was cutting
      // off the horizontal sides. Resetting the transform first measures
      // genuine scale-1 geometry (this doesn't cause a visible flash: the
      // reset and the new transform are both set before the browser's next
      // paint, since nothing yields to the event loop in between).
      container.style.transform = 'none';
      const box = container.getBoundingClientRect();
      const originX = box.left + box.width / 2; // horizontally centered anchor
      const originY = box.bottom; // bottom-anchored (see .scale-wrapper's justify-content:flex-end), so the scale reaches down toward whatever sits below the wrapper instead of leaving a gap above it

      // Sentinel init (not box.top/box.bottom!) - a fallback of the box's
      // own edges would never get overwritten by the loop below whenever
      // real content falls short of that edge (exactly the case for the
      // bottom edge: the 280px box has empty space below the artwork), so
      // it has to genuinely track the true min/max seen, then fall back to
      // the nominal box only if nothing was measured at all.
      let halfW = 0, contentTop = Infinity, contentBottom = -Infinity;
      const nodes = container.querySelectorAll('*');
      for (let i = 0; i < nodes.length; i++) {
        const r = nodes[i].getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        halfW = Math.max(halfW, originX - r.left, r.right - originX);
        contentTop = Math.min(contentTop, r.top);
        contentBottom = Math.max(contentBottom, r.bottom);
      }
      if (contentBottom < contentTop) { halfW = box.width / 2; contentTop = box.top; contentBottom = box.bottom; }

      // Sandbox mode sizes off SANDBOX_REF (the scale's own static frame)
      // instead of the live tile measurement above, unioned so it can
      // still grow if an unusually tall stack would otherwise clip -
      // without this, adding or removing a variable/constant during
      // open-ended exploration made the whole scale visibly zoom in and
      // out as its true content bounds shifted (worsened by the .neg-area
      // balloons' own 0.3s "bottom" transition, which fitScale() could
      // catch mid-animation). The frame itself doesn't change size, so
      // anchoring to it keeps the scale's own size constant while tile
      // stacks are still free to grow or shrink on their own.
      if (state.mode === 'sandbox') {
        contentTop = Math.min(contentTop, originY - SANDBOX_REF.up);
        contentBottom = Math.max(contentBottom, originY + SANDBOX_REF.down);
        halfW = Math.max(halfW, SANDBOX_REF.halfW);
      }

      const up = originY - contentTop;              // distance from the bottom anchor up to the content's top
      const down = contentBottom - originY;          // signed: negative when the visible art (pans/beam) falls short of the container's own declared bottom edge, which is the normal case - the 280px box has empty space below the artwork, so bottom-anchoring the box alone still leaves a gap above the controls bar

      const scaleW = (availableWidth / 2) / Math.max(halfW, 1);
      // up + down == contentBottom - contentTop (the TRUE content span)
      // regardless of down's sign - clamping down to 0 here (an earlier
      // version of this fix) undercounted the normal case where the art
      // falls short of the container's own bottom edge, which under-scaled
      // the whole assembly and left the leftover room stuck entirely above
      // it once the bottom-gap correction below shifted everything down.
      const scaleH = availableHeight / Math.max(up + down, 1);

      // Capped at whatever actually fits the wrapper (with a small safety
      // margin) - previously an extra 1.25x/1.45x was applied AFTER this
      // fit calculation, which guaranteed overflow (transform: scale()
      // doesn't reflow layout, so the oversized scale just visually spilled
      // out over the buttons/answer panel below it) on any screen where the
      // fit was already tight - exactly what broke mobile portrait,
      // landscape, and a narrowed desktop window.
      let finalScale = Math.min(scaleW, scaleH, 6.0) * 0.95;

      // Whichever dimension wasn't the binding constraint leaves leftover
      // room (e.g. a wide equation is often width-bound, leaving unused
      // height even though the scale is as big as it can be without either
      // distorting its proportions or overflowing sideways). Rather than
      // dumping 100% of that leftover as a gap above the scale (bottom-
      // flush) or below it (top-flush), split it evenly so the scale sits
      // roughly centered between the equation box above and the controls
      // bar below - as close to touching both as the artwork's own
      // proportions allow.
      const naturalSpan = (up + down) * finalScale;
      const leftover = Math.max(availableHeight - naturalSpan, 0);
      const gapPx = (down < 0 ? -down * finalScale : 0) - leftover / 2;

      container.style.transformOrigin = 'bottom center';
      container.style.transform = `translateY(${gapPx}px) scale(${finalScale})`;
    }

    const observer = new ResizeObserver(() => { fitScale(); });

    window.onload = () => {
        const wrapper = document.getElementById('scale-wrapper');
        if (wrapper) observer.observe(wrapper);
    }
    // Backstop for the resize/orientation-change path the ResizeObserver
    // above should already cover - cheap insurance against any browser
    // where that observer callback lags a window resize or a phone
    // rotation (the exact scenarios this was breaking under).
    window.addEventListener('resize', fitScale);
    window.addEventListener('orientationchange', fitScale);
    // Final safety net: fitScale() just reads the wrapper's current size
    // and sets a CSS transform, so polling it is essentially free - this
    // guarantees the scale self-corrects within half a second even if
    // every event-based path above somehow misses a resize.
    setInterval(fitScale, 500);

    function generateEquation(difficulty, levelIndex) {
      let attempts = 0;
      let left = { variables: 0, constants: 0, groups: null };
      let right = { variables: 0, constants: 0, groups: null };
      let solution = 5;

      while (attempts < 2000) {
        attempts++;
        let skipGlobalFraction = false;
        solution = Math.floor(Math.random() * 5) + 1;
        left = { variables: 0, constants: 0, groups: null };
        right = { variables: 0, constants: 0, groups: null };

        let useFraction = Math.random() < 0.25;

        switch (difficulty) {
          case '1-step':
            skipGlobalFraction = true;
            if (useFraction) {
              let d = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
              let c = Math.floor(Math.random() * 5) + 1;
              while (c * d > 10) c--;
              if (c < 1) continue;
              solution = c * d;
              left.variables = cleanFloat(1 / d);
              right.constants = c;
            } else {
              if (Math.random() > 0.5) {
                let a = Math.floor(Math.random() * 9) + 1;
                while (solution + a > 10) a--;
                if (a < 1) continue;
                left.variables = 1; left.constants = a;
                right.constants = solution + a;
              } else {
                let a = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
                while (a * solution > 10) solution--;
                if (solution < 1) continue;
                left.variables = a; right.constants = a * solution;
              }
            }
            break;

          case '2-step':
            skipGlobalFraction = true;
            if (!useFraction) {
              let a2 = Math.floor(Math.random() * 3) + 2;
              let maxB = 10 - (a2 * solution);
              if (maxB < 1) continue;
              let b2 = Math.floor(Math.random() * maxB) + 1;
              left.variables = a2; left.constants = b2;
              right.constants = a2 * solution + b2;
            } else {
              let d = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
              let b2 = Math.floor(Math.random() * 5) + 1;
              let c2 = solution + b2;
              if (c2 > 10) continue;
              left.variables = cleanFloat(1 / d);
              left.constants = cleanFloat(b2 / d);
              right.constants = cleanFloat(c2 / d);
            }
            break;

          case 'multi-step':
            skipGlobalFraction = !useFraction;
            let ax = Math.floor(Math.random() * 3) + 2;
            let cx = Math.floor(Math.random() * (ax - 1)) + 1;
            let maxBMulti = 10 - (ax * solution);
            if (maxBMulti < 1) continue;
            let b = Math.floor(Math.random() * maxBMulti) + 1;
            let rhs = ax * solution + b;
            let dVal = rhs - (cx * solution);
            if (dVal < 1 || dVal > 10) continue;
            left.variables = ax; left.constants = b;
            right.variables = cx; right.constants = dVal;
            break;

          case 'complex':
            skipGlobalFraction = true;
            let compType = Math.random();
            if (compType < 0.33) {
                let a2 = Math.floor(Math.random() * 3) + 2;
                let maxB = 10 - (a2 * solution);
                if (maxB < 1) continue;
                let b2 = Math.floor(Math.random() * maxB) + 1;
                let d = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
                left.variables = cleanFloat(a2 / d);
                left.constants = cleanFloat(b2 / d);
                right.constants = cleanFloat((a2 * solution + b2) / d);
            } else {
                let count = 2;
                let inVar = 1;
                let maxInConst = Math.floor((10 / count) - (inVar * solution));
                if (maxInConst < 1) continue;
                let inConst = Math.floor(Math.random() * maxInConst) + 1;
                let totalLeft = count * (inVar * solution + inConst);
                if (totalLeft > 10) continue;
                left.groups = { count, variables: inVar, constants: inConst };
                if (Math.random() > 0.5) { right.constants = totalLeft; }
                else {
                  let cx_var = 1;
                  let d_const = totalLeft - (cx_var * solution);
                  if (d_const < 1 || d_const > 10) continue;
                  right.variables = cx_var; right.constants = d_const;
                }
            }
            break;
        }

        if (!skipGlobalFraction) {
            let d = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
            left.variables = cleanFloat(left.variables / d);
            left.constants = cleanFloat(left.constants / d);
            if (left.groups) left.groups.count = cleanFloat(left.groups.count / d);
            right.variables = cleanFloat(right.variables / d);
            right.constants = cleanFloat(right.constants / d);
            if (right.groups) right.groups.count = cleanFloat(right.groups.count / d);
        }

        const getVars = (s) => Math.abs(s.variables) + (s.groups ? Math.abs(s.groups.count * s.groups.variables) : 0);
        const getConsts = (s) => Math.abs(s.constants) + (s.groups ? Math.abs(s.groups.count * s.groups.constants) : 0);

        if (getVars(left) === getVars(right)) continue;
        if (getVars(left) > 10 || getVars(right) > 10 || getConsts(left) > 10 || getConsts(right) > 10) continue;
        if (Math.random() > 0.5) { let temp = left; left = right; right = temp; }

        let eqStr1 = formatSideHTML(left) + "=" + formatSideHTML(right);
        let eqStr2 = formatSideHTML(right) + "=" + formatSideHTML(left);

        if (state.seenEquations && (state.seenEquations.has(eqStr1) || state.seenEquations.has(eqStr2))) continue;

        if (state.seenEquations) {
            state.seenEquations.add(eqStr1);
            state.seenEquations.add(eqStr2);
        }

        break;
      }
      return { left, right, solution };
    }

    function toImproperFraction(val) {
        let sign = val < 0 ? '-' : '';
        val = Math.abs(val);
        if (isInt(val)) return sign + Math.round(val);

        let gcd = function(a, b) { return b ? gcd(b, a % b) : a; };
        let num = Math.round(val * 60);
        let den = 60;
        let g = gcd(num, den);
        num /= g; den /= g;

        return `${sign}<span class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></span>`;
    }

    function formatSideHTML(s) {
      let parts = [];
      let plus = `<span style="margin: 0 0.15em;">+</span>`;
      let minus = `<span style="margin: 0 0.15em;">-</span>`;

      if (s.groups) {
        let gInner = [];
        if (s.groups.variables !== 0) {
          let vStr = Math.abs(s.groups.variables) === 1 ? 'x' : toImproperFraction(Math.abs(s.groups.variables)) + 'x';
          if (s.groups.variables < 0) vStr = '-' + vStr;
          gInner.push(`<span style="color: ${VAR_COLOR};">${vStr}</span>`);
        }
        if (s.groups.constants !== 0) {
          let cStr = toImproperFraction(Math.abs(s.groups.constants));
          if (s.groups.constants > 0 && gInner.length > 0) gInner.push(`${plus} <span style="color: ${CONST_COLOR};">${cStr}</span>`);
          else if (s.groups.constants < 0 && gInner.length > 0) gInner.push(`${minus} <span style="color: ${CONST_COLOR};">${cStr}</span>`);
          else gInner.push(`<span style="color: ${CONST_COLOR};">${s.groups.constants < 0 ? '-' : ''}${cStr}</span>`);
        }
        parts.push(`<span style="color: ${CONST_COLOR};">${toImproperFraction(s.groups.count)}</span>(${gInner.join(' ')})`);
      }
      if (s.variables !== 0) {
        let vStr = Math.abs(s.variables) === 1 ? 'x' : toImproperFraction(Math.abs(s.variables)) + 'x';
        if (s.variables > 0 && parts.length > 0) parts.push(`${plus} <span style="color: ${VAR_COLOR};">${vStr}</span>`);
        else if (s.variables < 0 && parts.length > 0) parts.push(`${minus} <span style="color: ${VAR_COLOR};">${vStr}</span>`);
        else parts.push(`<span style="color: ${VAR_COLOR};">${s.variables < 0 ? '-' : ''}${vStr}</span>`);
      }
      if (s.constants !== 0) {
        let cStr = toImproperFraction(Math.abs(s.constants));
        if (s.constants > 0 && parts.length > 0) parts.push(`${plus} <span style="color: ${CONST_COLOR};">${cStr}</span>`);
        else if (s.constants < 0 && parts.length > 0) parts.push(`${minus} <span style="color: ${CONST_COLOR};">${cStr}</span>`);
        else parts.push(`<span style="color: ${CONST_COLOR};">${s.constants < 0 ? '-' : ''}${cStr}</span>`);
      }
      return parts.length ? parts.join(' ') : `<span style="color: ${CONST_COLOR};">0</span>`;
    }

    function getExpandedTerms(s) {
      let terms = [];
      if (s.groups) {
        let gCountFull = Math.floor(Math.abs(s.groups.count));
        for (let i = 0; i < gCountFull; i++) {
           let v = Math.abs(s.groups.variables);
           for (let j=0; j<Math.floor(v); j++) terms.push(s.groups.variables > 0 ? 'x' : '-x');
           if (v - Math.floor(v) > 0.001) terms.push((s.groups.variables > 0 ? '' : '-') + toImproperFraction(v - Math.floor(v)) + 'x');

           let c = Math.abs(s.groups.constants);
           for (let k=0; k<Math.floor(c); k++) terms.push(s.groups.constants > 0 ? '1' : '-1');
           if (c - Math.floor(c) > 0.001) terms.push((s.groups.constants > 0 ? '' : '-') + toImproperFraction(c - Math.floor(c)));
        }
      }

      let vFull = Math.floor(Math.abs(s.variables));
      let vFrac = Math.abs(s.variables) - vFull;
      for (let i = 0; i < vFull; i++) terms.push(s.variables > 0 ? 'x' : '-x');
      if (vFrac > 0.001) terms.push((s.variables > 0 ? '' : '-') + toImproperFraction(vFrac) + 'x');

      let cFull = Math.floor(Math.abs(s.constants));
      let cFrac = Math.abs(s.constants) - cFull;
      for (let i = 0; i < cFull; i++) terms.push(s.constants > 0 ? '1' : '-1');
      if (cFrac > 0.001) terms.push((s.constants > 0 ? '' : '-') + toImproperFraction(cFrac));

      return terms;
    }

    function getExpandedHtmlParts(terms, limit) {
      let parts = [];
      if (terms.length > 0 && limit === 0) {
        return [`<span style="color: #94a3b8;">...</span>`];
      }
      for (let i = 0; i < terms.length; i++) {
        if (i >= limit) {
          parts.push(` <span style="color: #94a3b8;">...</span>`);
          break;
        }
        let t = terms[i];
        let color = t.includes('x') ? VAR_COLOR : CONST_COLOR;
        let sign = t.startsWith('-') ? '-' : '+';
        let valHtml = t;
        if (sign === '-') valHtml = valHtml.substring(1);

        if (i === 0) {
          parts.push(`<span style="color: ${color};">${sign === '-' ? '-' : ''}${valHtml}</span>`);
        } else {
          parts.push(` <span style="color: #cbd5e1; margin: 0 0.15em;">${sign}</span> <span style="color: ${color};">${valHtml}</span>`);
        }
      }
      return parts;
    }

    function formatSubstitutionHTML(s, xVal) {
      let parts = [];
      let plus = `<span style="margin: 0 0.15em;">+</span>`;
      let minus = `<span style="margin: 0 0.15em;">-</span>`;

      if (s.variables !== 0) {
        let coef = Math.abs(s.variables) === 1 ? '' : toImproperFraction(Math.abs(s.variables));
        if (s.variables < 0) coef = '-' + coef;
        parts.push(`<span style="color: ${VAR_COLOR};">${coef}(${toImproperFraction(xVal)})</span>`);
      }
      if (s.constants !== 0) {
        let cStr = toImproperFraction(Math.abs(s.constants));
        if (parts.length > 0) parts.push(s.constants > 0 ? `${plus} <span style="color: ${CONST_COLOR};">${cStr}</span>` : `${minus} <span style="color: ${CONST_COLOR};">${cStr}</span>`);
        else parts.push(`<span style="color: ${CONST_COLOR};">${s.constants < 0 ? '-' : ''}${cStr}</span>`);
      }
      return parts.length ? parts.join(' ') : `<span style="color: ${CONST_COLOR};">0</span>`;
    }

    // results by skill (site-results.js): each kind of equation, shown when the student leaves the challenge
    if (window.SiteResults) SiteResults.setup([{ id: '1-step', en: '1-step equations', es: 'Ecuaciones de 1 paso' }, { id: '2-step', en: '2-step equations', es: 'Ecuaciones de 2 pasos' }, { id: 'multi-step', en: 'Variables on both sides', es: 'Variables en ambos lados' }, { id: 'complex', en: 'Complex equations', es: 'Ecuaciones complejas' }]);
    function setMode(newMode) {
      if (window.SiteResults && state.mode === 'challenge' && newMode !== 'challenge') { SiteResults.show({ title: tl('Your results', 'Tus resultados') }); SiteResults.reset(); }
      state.mode = newMode;
      document.getElementById('title-view').classList.toggle('hidden', newMode !== 'title');
      document.getElementById('difficulty-view').classList.toggle('hidden', newMode !== 'difficulty');
      document.getElementById('game-view').classList.toggle('hidden', newMode !== 'challenge' && newMode !== 'sandbox');
      if (newMode === 'challenge' || newMode === 'sandbox') updateUI();
    }

    // Exit-to-menu confirmation state - see requestModeChange, which every
    // setMode() button click is routed through (see TS_ACTIONS dispatcher below).
    var exitConfirmTarget = null;
    function requestModeChange(newMode) {
      var leavingActivePlay = (state.mode === 'challenge' || state.mode === 'sandbox') && newMode !== state.mode;
      if (!leavingActivePlay) { setMode(newMode); return; }
      exitConfirmTarget = newMode;
      document.getElementById('exit-confirm-layer').classList.remove('hidden');
    }
    function cancelExitConfirm() {
      exitConfirmTarget = null;
      document.getElementById('exit-confirm-layer').classList.add('hidden');
    }
    function confirmExit() {
      var target = exitConfirmTarget;
      exitConfirmTarget = null;
      document.getElementById('exit-confirm-layer').classList.add('hidden');
      setMode(target);
    }

    function startChallenge(diff) {
      state.difficulty = diff;
      state.levelIndex = 0;
      state.seenEquations = new Set();
      generateLevel();
      setMode('challenge');
      if (diff === 'multi-step' || diff === 'complex') setTimeout(maybeShowExpandTip, 350);
    }

    // The first time a student plays Variables Both Sides or Complex Equations, a pop-up points at the Expand
    // button and explains it (once per browser).
    const EXPAND_TIP_KEY = 'tipthescales_expand_tip_seen';
    function maybeShowExpandTip() {
      let seen = false;
      try { seen = localStorage.getItem(EXPAND_TIP_KEY) === '1'; } catch (e) {}
      const btn = document.getElementById('btn-expand');
      if (seen || state.mode !== 'challenge' || !btn || !btn.offsetParent) return;
      document.getElementById('expand-tip-layer').classList.remove('hidden');
      placeExpandTip();
      document.querySelector('.expand-tip-ok').focus({ preventScroll: true });
    }
    function placeExpandTip() {
      const layer = document.getElementById('expand-tip-layer');
      if (layer.classList.contains('hidden')) return;
      const r = document.getElementById('btn-expand').getBoundingClientRect();
      const ring = document.getElementById('expand-tip-ring'), bub = document.getElementById('expand-tip-bubble');
      ring.style.left = (r.left - 6) + 'px'; ring.style.top = (r.top - 6) + 'px';
      ring.style.width = (r.width + 12) + 'px'; ring.style.height = (r.height + 12) + 'px';
      const bw = bub.offsetWidth, bh = bub.offsetHeight, cx = r.left + r.width / 2;
      const left = Math.max(12, Math.min(window.innerWidth - bw - 12, cx - bw / 2));
      const above = r.top - bh - 20 >= 8;   // above the button if it fits, otherwise below it
      bub.classList.toggle('below', !above);
      bub.style.left = left + 'px';
      bub.style.top = (above ? r.top - bh - 20 : r.bottom + 20) + 'px';
      bub.style.setProperty('--ax', Math.max(18, Math.min(bw - 18, cx - left)) + 'px');
    }
    function closeExpandTip() {
      document.getElementById('expand-tip-layer').classList.add('hidden');
      try { localStorage.setItem(EXPAND_TIP_KEY, '1'); } catch (e) {}
      const btn = document.getElementById('btn-expand');
      if (btn && btn.offsetParent) btn.focus({ preventScroll: true });
    }
    window.addEventListener('resize', placeExpandTip);
    // Esc closes it too (instead of leaving the level)
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || document.getElementById('expand-tip-layer').classList.contains('hidden')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      closeExpandTip();
    }, true);
    document.getElementById('expand-tip-layer').addEventListener('click', function (e) { if (e.target === this) closeExpandTip(); });

    function generateLevel() {
      const eq = generateEquation(state.difficulty, state.levelIndex);
      state.leftState = eq.left;
      state.rightState = eq.right;
      state.initialLeft = cloneSide(eq.left);
      state.initialRight = cloneSide(eq.right);
      state.xValue = eq.solution;
      state.history = [];
      state.isWin = false;
      state.message = '';

      const input = document.getElementById('user-answer-input');
      if (input) input.value = '';

      updateUI();
    }

    function resetLevel() {
      if (state.mode !== 'challenge' || state.isWin) return;
      state.leftState = cloneSide(state.initialLeft);
      state.rightState = cloneSide(state.initialRight);
      state.history = [];
      state.message = '';

      const input = document.getElementById('user-answer-input');
      if (input) input.value = '';

      updateUI();
    }

    function nextLevel() {
      state.levelIndex++;
      if (state.levelIndex >= 15) { setMode('difficulty'); return; }
      generateLevel();
    }

    function startSandbox() {
      state.leftState = { variables: 0, constants: 0, groups: null };
      state.rightState = { variables: 0, constants: 0, groups: null };
      state.initialLeft = { variables: 0, constants: 0, groups: null };
      state.initialRight = { variables: 0, constants: 0, groups: null };
      state.xValue = 5;
      state.history = [];
      state.isWin = false;
      state.message = '';
      setMode('sandbox');
    }

    function handleOp(type, target) {
      if (state.isWin) return;
      let leftVars = state.leftState.variables; let rightVars = state.rightState.variables;
      let leftConsts = state.leftState.constants; let rightConsts = state.rightState.constants;

      let step = 1;

      if (type === 'add' && target === 'var') { leftVars+=step; rightVars+=step; }
      if (type === 'sub' && target === 'var') { leftVars-=step; rightVars-=step; }
      if (type === 'add' && target === 'const') { leftConsts+=step; rightConsts+=step; }
      if (type === 'sub' && target === 'const') { leftConsts-=step; rightConsts-=step; }

      if (Math.abs(leftVars) > 10 || Math.abs(rightVars) > 10 || Math.abs(leftConsts) > 10 || Math.abs(rightConsts) > 10) {
        showMessage(tl('Max limit of 10 reached!', '¡Llegaste al límite de 10!')); return;
      }
      state.history.push({ left: cloneSide(state.leftState), right: cloneSide(state.rightState) });
      state.leftState.variables = cleanFloat(leftVars); state.rightState.variables = cleanFloat(rightVars);
      state.leftState.constants = cleanFloat(leftConsts); state.rightState.constants = cleanFloat(rightConsts);
      updateUI();
    }

    function handleSandboxOp(side, type, target) {
      let targetSide = side === 'left' ? state.leftState : state.rightState;
      let vars = targetSide.variables; let consts = targetSide.constants;

      let step = 1;

      if (type === 'add' && target === 'var') vars+=step;
      if (type === 'sub' && target === 'var') vars-=step;
      if (type === 'add' && target === 'const') consts+=step;
      if (type === 'sub' && target === 'const') consts-=step;

      if (Math.abs(vars) > 10 || Math.abs(consts) > 10) { showMessage(tl('Max limit of 10 reached!', '¡Llegaste al límite de 10!')); return; }
      state.history.push({ left: cloneSide(state.leftState), right: cloneSide(state.rightState) });

      targetSide.variables = cleanFloat(vars); targetSide.constants = cleanFloat(consts);
      updateUI();
    }

    function changeXValue(delta) {
      if (state.mode !== 'sandbox') return;
      let newX = cleanFloat(state.xValue + delta);
      if (newX > 10) newX = 10; if (newX < -10) newX = -10;
      state.xValue = newX; updateUI();
    }

    function handleMultiply(multiplier) {
      if (state.isWin) return;

      const checkExceeds = (s) => {
          let nV = s.variables * multiplier;
          let nC = s.constants * multiplier;
          let nGC = s.groups ? s.groups.count * multiplier : 0;
          if (!s.groups && (s.variables !== 0 || s.constants !== 0)) {
              nGC = multiplier;
              nV = 0; nC = 0;
          } else if (s.groups && (s.variables !== 0 || s.constants !== 0)) {
              nV = (s.variables + s.groups.count * s.groups.variables) * multiplier;
              nC = (s.constants + s.groups.count * s.groups.constants) * multiplier;
              nGC = 0;
          }
          return Math.abs(nV) > 10 || Math.abs(nC) > 10 || Math.abs(nGC) > 10;
      };

      // 1-Step and 2-Step Equations distribute right away (×2 turns x + 3 into 2x + 6, never 2(x + 3)); the Expand
      // button, and parentheses, are for Variables Both Sides and Complex
      const autoDistribute = state.mode === 'challenge' && (state.difficulty === '1-step' || state.difficulty === '2-step');
      const expandedExceeds = (s) => {
          const g = s.groups;
          return Math.abs((s.variables + (g ? g.count * g.variables : 0)) * multiplier) > 10 ||
                 Math.abs((s.constants + (g ? g.count * g.constants : 0)) * multiplier) > 10;
      };
      const exceeds = autoDistribute ? (expandedExceeds(state.leftState) || expandedExceeds(state.rightState))
                                     : (checkExceeds(state.leftState) || checkExceeds(state.rightState));
      if (exceeds) { showMessage(tl('Exceeds limit of 10!', '¡Pasa el límite de 10!')); return; }

      state.history.push({ left: cloneSide(state.leftState), right: cloneSide(state.rightState) });

      const applyMult = (s, m) => {
          if (!s.groups) {
              if (s.variables !== 0 || s.constants !== 0) {
                  s.groups = { count: m, variables: s.variables, constants: s.constants };
                  s.variables = 0;
                  s.constants = 0;
              }
          } else if (s.variables === 0 && s.constants === 0) {
              s.groups.count = cleanFloat(s.groups.count * m);
          } else {
              let totalV = cleanFloat(s.variables + s.groups.count * s.groups.variables);
              let totalC = cleanFloat(s.constants + s.groups.count * s.groups.constants);
              s.groups = { count: m, variables: totalV, constants: totalC };
              s.variables = 0;
              s.constants = 0;
          }
          cleanGroups(s);
      };

      applyMult(state.leftState, multiplier);
      applyMult(state.rightState, multiplier);
      if (autoDistribute) {
          [state.leftState, state.rightState].forEach((s) => {
              if (!s.groups) return;
              s.variables = cleanFloat(s.variables + s.groups.variables * s.groups.count);
              s.constants = cleanFloat(s.constants + s.groups.constants * s.groups.count);
              s.groups = null;
          });
      }

      updateUI();
    }

    function handleDivide(divisor) {
      if (state.isWin) return;

      const dividesCleanly = (s) => isInt(s.variables / divisor) && isInt(s.constants / divisor) && (!s.groups || isInt(s.groups.count / divisor));

      if (!dividesCleanly(state.leftState) || !dividesCleanly(state.rightState)) {
          state.pendingDivisor = divisor;
          document.getElementById('warning-layer').classList.remove('hidden');
          return;
      }

      executeDivide(divisor);
    }

    function cancelWarning() {
        state.pendingDivisor = null;
        document.getElementById('warning-layer').classList.add('hidden');
    }

    function proceedWarning() {
        if (state.pendingDivisor) {
            executeDivide(state.pendingDivisor);
            state.pendingDivisor = null;
        }
        document.getElementById('warning-layer').classList.add('hidden');
    }

    function executeDivide(divisor) {
      state.history.push({ left: cloneSide(state.leftState), right: cloneSide(state.rightState) });

      state.leftState.variables = cleanFloat(state.leftState.variables / divisor);
      state.leftState.constants = cleanFloat(state.leftState.constants / divisor);
      if (state.leftState.groups) state.leftState.groups.count = cleanFloat(state.leftState.groups.count / divisor);

      state.rightState.variables = cleanFloat(state.rightState.variables / divisor);
      state.rightState.constants = cleanFloat(state.rightState.constants / divisor);
      if (state.rightState.groups) state.rightState.groups.count = cleanFloat(state.rightState.groups.count / divisor);

      cleanGroups(state.leftState);
      cleanGroups(state.rightState);

      updateUI();
    }

    function handleExpand() {
      if (state.isWin) return;
      let lVars = state.leftState.variables + (state.leftState.groups ? state.leftState.groups.variables * state.leftState.groups.count : 0);
      let lConsts = state.leftState.constants + (state.leftState.groups ? state.leftState.groups.constants * state.leftState.groups.count : 0);
      let rVars = state.rightState.variables + (state.rightState.groups ? state.rightState.groups.variables * state.rightState.groups.count : 0);
      let rConsts = state.rightState.constants + (state.rightState.groups ? state.rightState.groups.constants * state.rightState.groups.count : 0);

      if (Math.abs(lVars) > 10 || Math.abs(lConsts) > 10 || Math.abs(rVars) > 10 || Math.abs(rConsts) > 10) { showMessage(tl('Exceeds limit of 10!', '¡Pasa el límite de 10!')); return; }

      state.history.push({ left: cloneSide(state.leftState), right: cloneSide(state.rightState) });
      const exp = (s) => {
          if (s.groups) {
              s.variables = cleanFloat(s.variables + s.groups.variables * s.groups.count);
              s.constants = cleanFloat(s.constants + s.groups.constants * s.groups.count);
              s.groups = null;
          }
      };
      exp(state.leftState); exp(state.rightState);
      updateUI();
    }

    function handleFactor() {
      if (state.isWin) return;
      state.history.push({ left: cloneSide(state.leftState), right: cloneSide(state.rightState) });

      const applyFactor = (s) => {
          let g = getFactor(s);
          if (g > 1) {
              s.groups = { count: g, variables: cleanFloat(s.variables / g), constants: cleanFloat(s.constants / g) };
              s.variables = 0;
              s.constants = 0;
          }
      };

      applyFactor(state.leftState);
      applyFactor(state.rightState);
      updateUI();
    }

    function handleUndo() {
      if (state.history.length === 0 || state.isWin) return;
      const last = state.history.pop();
      state.leftState = last.left; state.rightState = last.right; state.message = '';
      updateUI();
    }

    function parseUserAnswer(val) {
        if (val.includes('/')) {
            let parts = val.split('/');
            if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                return parseFloat(parts[0]) / parseFloat(parts[1]);
            }
        }
        return parseFloat(val);
    }

    function submitAnswer() {
      if (state.mode !== 'challenge' || state.isWin) return;

      const input = document.getElementById('user-answer-input');
      const valText = input.value.trim();
      const val = parseUserAnswer(valText);

      if (isNaN(val) || valText === '') {
        showMessage(tl("Please enter a valid number or fraction (e.g. 5 or 5/2)!", "¡Escribe un número o una fracción válida (p. ej. 5 o 5/2)!"));
        return;
      }

      if (window.SiteResults) SiteResults.record(state.difficulty, Math.abs(val - state.xValue) < 0.001);
      if (Math.abs(val - state.xValue) < 0.001) {
        state.isWin = true;
        updateUI();
      } else {
        // Reset problem to initial state
        state.leftState = cloneSide(state.initialLeft);
        state.rightState = cloneSide(state.initialRight);
        state.history = [];
        input.value = '';

        // Provide hint based on difficulty
        let hint = tl("Perform the same operations on both sides to isolate x.", "Haz las mismas operaciones en ambos lados para dejar x sola.");
        if (state.difficulty === '2-step') {
            hint = tl("Try moving constants to one side first, then divide.", "Primero pasa las constantes a un lado y luego divide.");
        } else if (state.difficulty === 'multi-step') {
            hint = tl("Try to get all variables on one side and constants on the other.", "Pon todas las variables en un lado y las constantes en el otro.");
        } else if (state.difficulty === 'complex') {
            hint = tl("Expand the groups first to see all the terms clearly.", "Primero expande los grupos para ver bien todos los términos.");
        }

        // Add specific fraction hint if the current state has fractions
        if (!isInt(state.leftState.variables) || !isInt(state.leftState.constants) || !isInt(state.rightState.variables) || !isInt(state.rightState.constants)) {
            hint = tl("Try multiplying both sides by the denominator to clear fractions!", "¡Multiplica ambos lados por el denominador para quitar las fracciones!");
        }

        showMessage(tl("Incorrect! Hint: ", "¡Incorrecto! Pista: ") + hint);
        updateUI();
      }
    }

    function renderShapes(side) {
      let h = '';
      if (side.groups && side.groups.count > 0) {
        h += `<div style="display: flex; gap: 4px; justify-content: center; width: 100%; margin-bottom: 4px;">`;
        let gCount = Math.floor(Math.abs(side.groups.count));
        for(let i=0; i<gCount; i++) {
          h += `<div class="group-wrap">`;
          let vFull = Math.floor(Math.abs(side.groups.variables));
          let vFrac = cleanFloat(Math.abs(side.groups.variables) - vFull);
          for(let v=0; v<vFull; v++) h += `<div class="shape-var">x</div>`;
          if (vFrac > 0.001) h += `<div class="shape-var part" style="--f: ${vFrac};">${toImproperFraction(vFrac)}x</div>`;

          let cFull = Math.floor(Math.abs(side.groups.constants));
          let cFrac = cleanFloat(Math.abs(side.groups.constants) - cFull);
          for(let c=0; c<cFull; c++) h += `<div class="shape-const">1</div>`;
          if (cFrac > 0.001) {
              h += `<div class="shape-const part" style="--f: ${cFrac};">${toImproperFraction(cFrac)}</div>`;
          }
          h += `</div>`;
        }
        h += `</div>`;
      }

      let items = [];
      let posVars = cleanFloat(side.variables);
      if (posVars > 0) {
          let full = Math.floor(posVars);
          let frac = cleanFloat(posVars - full);
          for(let i=0; i<full; i++) items.push({ type: 'var', label: 'x', frac: 1 });
          if (frac > 0.001) items.push({ type: 'var', label: toImproperFraction(frac) + 'x', frac: frac });
      }

      let posConsts = cleanFloat(side.constants);
      if (posConsts > 0) {
          let full = Math.floor(posConsts);
          let frac = cleanFloat(posConsts - full);
          for(let i=0; i<full; i++) items.push({ type: 'const', label: '1', frac: 1 });
          if (frac > 0.001) items.push({ type: 'const', label: toImproperFraction(frac), frac: frac });
      }

      let chunks = [];
      for(let i=0; i<items.length; i+=5) {
        chunks.push(items.slice(i, i+5));
      }

      chunks.forEach(chunk => {
        h += `<div style="display: flex; gap: 4px; justify-content: center; align-items: flex-end; width: 100%;">`;
        chunk.forEach(b => {
          let bClass = b.type === 'var' ? 'shape-var' : 'shape-const';
          // a fraction of a block: whole size, dashed, with just that fraction filled in
          if (b.frac < 1) bClass += ' part';
          let style = b.frac < 1 ? `--f: ${b.frac};` : '';
          h += `<div class="${bClass}" style="${style}">${b.label}</div>`;
        });
        h += `</div>`;
      });
      return h;
    }

    function renderBalloons(side, baseHeight) {
      let h = '';
      let items = [];

      let negVars = cleanFloat(Math.abs(Math.min(0, side.variables)));
      if (negVars > 0) {
          let full = Math.floor(negVars);
          let frac = cleanFloat(negVars - full);
          for(let i=0; i<full; i++) items.push({ type: 'var', label: '-x', frac: 1 });
          if (frac > 0.001) items.push({ type: 'var', label: '-' + toImproperFraction(frac) + 'x', frac: frac });
      }

      let negConsts = cleanFloat(Math.abs(Math.min(0, side.constants)));
      if (negConsts > 0) {
          let full = Math.floor(negConsts);
          let frac = cleanFloat(negConsts - full);
          for(let i=0; i<full; i++) items.push({ type: 'const', label: '-1', frac: 1 });
          if (frac > 0.001) items.push({ type: 'const', label: '-' + toImproperFraction(frac), frac: frac });
      }

      let chunks = [];
      for(let i=0; i<items.length; i+=5) {
        chunks.push(items.slice(i, i+5));
      }

      chunks.forEach((chunk, rowIndex) => {
        let stringLen = baseHeight + (rowIndex * 46) + 19;

        h += `<div style="display: flex; gap: 6px; justify-content: center; width: 100%;">`;
        chunk.forEach(b => {
          let bClass = b.type === 'var' ? 'b-var' : 'b-const';
          let scale = 1;   // a fraction of a balloon stays whole size, with just that fraction filled in
          if (b.frac < 1) bClass += ' part';
          let bStyle = b.frac < 1 ? `--f: ${b.frac};` : '';
          let lStyle = '';

          h += `<div class="b-wrapper${b.frac < 1 ? ' part-wrap' : ''}">
                  <div class="balloon ${bClass}" style="${bStyle}">
                    <span class="b-label" style="${lStyle}">${b.label}</span>
                    <div class="b-string" style="--string-len: ${stringLen / scale}px;"></div>
                  </div>
                </div>`;
        });
        h += `</div>`;
      });
      return h;
    }

    function getPosRows(side) {
      let posCount = Math.ceil(Math.max(0, side.variables)) + Math.ceil(Math.max(0, side.constants));
      return Math.ceil(posCount / 5) + (side.groups && Math.abs(side.groups.count) > 0 ? 1 : 0);
    }

    function updateUI() {
      const isSandbox = state.mode === 'sandbox';

      // Toggle Specific Overlays & Layouts
      document.getElementById('challenge-nav').classList.toggle('hidden', isSandbox);
      document.getElementById('challenge-controls').classList.toggle('hidden', isSandbox);
      document.getElementById('challenge-answer-panel').classList.toggle('hidden', isSandbox);
      document.getElementById('sandbox-nav').classList.toggle('hidden', !isSandbox);

      document.getElementById('sandbox-left-panel').classList.toggle('hidden', !isSandbox);
      document.getElementById('sandbox-right-panel').classList.toggle('hidden', !isSandbox);

      if (!isSandbox) {
        document.getElementById('diff-badge').innerText = tl(state.difficulty.replace('-', ' ') + ' equations', { '1-step': 'ecuaciones de 1 paso', '2-step': 'ecuaciones de 2 pasos', 'multi-step': 'variables en ambos lados', complex: 'ecuaciones complejas' }[state.difficulty]);
        let dots = '';
        for(let i=0; i<15; i++) {
          let cls = i < state.levelIndex ? 'dot-done' : (i === state.levelIndex ? 'dot-current' : 'dot-pending');
          dots += `<div class="dot ${cls}"></div>`;
        }
        document.getElementById('level-dots').innerHTML = dots;

        const expBtn = document.getElementById('btn-expand');

        const lFactor = getFactor(state.leftState);
        const rFactor = getFactor(state.rightState);
        const canExpand = (state.leftState.groups !== null || state.rightState.groups !== null);
        const canFactor = (!canExpand && (lFactor > 1 || rFactor > 1));

        if (canExpand) {
            expBtn.classList.remove('hidden', 'factor-mode', 'disabled');
            expBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8M9 15l-6 6m6-6v4.8m0-4.8H4.2M9 9 3 3m6 6V4.2M9 9H4.2m5.8-5.8 6 6m-6-6v4.8m0-4.8h4.8"/></svg> ${tl("Expand", "Expandir")}`;
            expBtn.onclick = handleExpand;
        } else if (canFactor) {
            expBtn.classList.remove('hidden', 'disabled');
            expBtn.classList.add('factor-mode');
            expBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M10 14l-7 7"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M14 14h6v6"/><path d="M14 14l7 7"/><path d="M10 10H4V4"/><path d="M10 10L3 3"/></svg> ${tl("Factor", "Factorizar")}`;
            expBtn.onclick = handleFactor;
        } else {
            expBtn.classList.remove('hidden', 'factor-mode');
            expBtn.classList.add('disabled');
            expBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8M9 15l-6 6m6-6v4.8m0-4.8H4.2M9 9 3 3m6 6V4.2M9 9H4.2m5.8-5.8 6 6m-6-6v4.8m0-4.8h4.8"/></svg> ${tl("Expand", "Expandir")}`;
            expBtn.onclick = null;
        }
        // 1-Step and 2-Step Equations never need it (multiplying there distributes right away - see handleMultiply), so the
        // button only shows in Variables Both Sides and Complex
        if (state.mode === 'challenge' && (state.difficulty === '1-step' || state.difficulty === '2-step')) expBtn.classList.add('hidden');
      }

      // Sandbox used to push the scale down by a fixed 200px here,
      // regardless of viewport size - harmless on a tall desktop screen
      // (fitScale() is already width-bound there, so the scale's size
      // doesn't change either way) but a serious problem on a short
      // mobile/landscape viewport, where it ate a fixed chunk of the
      // wrapper's vertical budget before fitScale() ever got to work with
      // what was left. fitScale()'s own dynamic centering (see SANDBOX_REF)
      // already positions the scale sensibly, so this no longer needs a
      // mode-specific override.
      document.getElementById('scale-wrapper').style.marginTop = '0.25rem';

      const getW = (s) => s.variables * state.xValue + s.constants + (s.groups ? s.groups.count * (s.groups.variables * state.xValue + s.groups.constants) : 0);
      const leftWeight = getW(state.leftState);
      const rightWeight = getW(state.rightState);
      const difference = rightWeight - leftWeight;

      const isEqual = Math.abs(leftWeight - rightWeight) < 0.001;
      const signStr = isEqual ? '=' : '≠';
      const signColor = isEqual ? '#22c55e' : '#ef4444';
      const signHtml = `<span style="color: ${signColor}; font-weight: 900; font-size: 1.3em;">${signStr}</span>`;

      // Update Color-Coded Equation Displays
      document.getElementById('eq-left').innerHTML = formatSideHTML(state.leftState);
      document.getElementById('eq-right').innerHTML = formatSideHTML(state.rightState);
      document.getElementById('eq-sign').innerHTML = signHtml;

      // Generate the Expanded Forms
      let leftTerms = getExpandedTerms(state.leftState);
      let rightTerms = getExpandedTerms(state.rightState);

      let maxTerms = 20;
      let leftLimit = leftTerms.length;
      let rightLimit = rightTerms.length;

      if (leftTerms.length + rightTerms.length > maxTerms) {
        leftLimit = Math.min(leftTerms.length, maxTerms);
        rightLimit = Math.max(0, maxTerms - leftLimit);
      }

      let leftExpHtml = getExpandedHtmlParts(leftTerms, leftLimit).join('');
      let rightExpHtml = getExpandedHtmlParts(rightTerms, rightLimit).join('');
      if (leftTerms.length === 0) leftExpHtml = `<span style="color: ${CONST_COLOR};">0</span>`;
      if (rightTerms.length === 0) rightExpHtml = `<span style="color: ${CONST_COLOR};">0</span>`;

      document.getElementById('eq-exp-left').innerHTML = leftExpHtml;
      document.getElementById('eq-exp-right').innerHTML = rightExpHtml;
      document.getElementById('eq-exp-sign').innerHTML = signHtml;

      if (isSandbox) {
        document.getElementById('sandbox-math-panel').classList.remove('hidden');
        document.getElementById('sandbox-x-val').innerHTML = toImproperFraction(state.xValue);
        document.getElementById('sandbox-sub-left').innerHTML = formatSubstitutionHTML(state.leftState, state.xValue);
        document.getElementById('sandbox-sub-right').innerHTML = formatSubstitutionHTML(state.rightState, state.xValue);
        document.getElementById('sandbox-sub-sign').innerHTML = signHtml;
        document.getElementById('sandbox-simp-left').innerHTML = `<span style="color: ${CONST_COLOR};">${toImproperFraction(leftWeight)}</span>`;
        document.getElementById('sandbox-simp-right').innerHTML = `<span style="color: ${CONST_COLOR};">${toImproperFraction(rightWeight)}</span>`;
        document.getElementById('sandbox-simp-sign').innerHTML = signHtml;
      } else {
        document.getElementById('sandbox-math-panel').classList.add('hidden');
      }

      const msgBox = document.getElementById('msg-box');
      if (state.message) { document.getElementById('msg-text').innerText = state.message; msgBox.classList.remove('hidden'); }
      else { msgBox.classList.add('hidden'); }

      const undoChallenge = document.getElementById('btn-undo-challenge');
      if (state.history.length > 0 && !state.isWin) {
        if(undoChallenge) { undoChallenge.classList.add('active'); undoChallenge.classList.remove('disabled'); }
      } else {
        if(undoChallenge) { undoChallenge.classList.remove('active'); undoChallenge.classList.add('disabled'); }
      }

      const tilt = Math.max(-8, Math.min(8, difference * 1.5));
      document.getElementById('scale-beam').style.transform = `rotate(${tilt}deg)`;
      document.getElementById('pan-left').style.transform = `rotate(${-tilt}deg)`;
      document.getElementById('pan-right').style.transform = `rotate(${-tilt}deg)`;

      const leftBaseHeight = getPosRows(state.leftState) === 0 ? 25 : (getPosRows(state.leftState) * 42 + 5);
      const rightBaseHeight = getPosRows(state.rightState) === 0 ? 25 : (getPosRows(state.rightState) * 42 + 5);

      document.getElementById('left-neg').style.bottom = `calc(100% + ${leftBaseHeight}px)`;
      document.getElementById('right-neg').style.bottom = `calc(100% + ${rightBaseHeight}px)`;

      document.getElementById('left-pos').innerHTML = renderShapes(state.leftState);
      document.getElementById('left-neg').innerHTML = renderBalloons(state.leftState, leftBaseHeight);
      document.getElementById('right-pos').innerHTML = renderShapes(state.rightState);
      document.getElementById('right-neg').innerHTML = renderBalloons(state.rightState, rightBaseHeight);

      const winLyr = document.getElementById('win-layer');
      if (state.isWin && !isSandbox) {
        document.getElementById('win-title').innerText = state.levelIndex === 14 ? tl('Complete!', '¡Completado!') : tl('Solved!', '¡Resuelto!');
        document.getElementById('win-val').innerHTML = `<span style="color: ${VAR_COLOR};">x</span> <span style="color: #cbd5e1;">=</span> <span style="color: ${CONST_COLOR};">${toImproperFraction(state.xValue)}</span>`;
        winLyr.classList.remove('hidden');
      } else { winLyr.classList.add('hidden'); }

      // Fire auto-scaler to ensure scale is perfectly centered
      setTimeout(fitScale, 10);
    }

    setMode('title');
