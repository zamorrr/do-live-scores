
// ==UserScript==
// @name         Dugout Live Scores
// @namespace    dugout-live-scores
// @version      0.4.7
// @description  Live scores for league and cup, mobile support
// @match        https://dugout-online.com/game/*
// @match        https://www.dugout-online.com/game/*
// @match        https://dugout-online.com/competitions/*
// @match        https://www.dugout-online.com/competitions/*
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_getTabs
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  if (window.top !== window.self) return;

  const STALE_MS = 20000;
  const GOAL_MS = 60000;
  const REFRESH_MS = 2000;
  const HEARTBEAT_MS = 5000;

  const isGame =
    /\/game\/.*gameid\/\d+/.test(location.pathname);

  const isCompetition =
    /^\/competitions\/none(?:\/|$)/.test(location.pathname);

  if (!isGame && !isCompetition) return;

  // ==========================================
  // HELPERS
  // ==========================================

  const clean = value =>
    String(value || '').replace(/\s+/g, ' ').trim();

  const gameIdFromUrl = value =>
    String(value || '').match(/gameid\/(\d+)/i)?.[1] || null;

  const isAet = value =>
    /^a\.?e\.?t\.?$/i.test(clean(value));

  const isPens = value =>
    /^(?:pens?|penalties)\s+\d+\s*[:\-]\s*\d+$/i
      .test(clean(value));

  function getStatus(value) {
    const status = clean(value)
      .replace(/^MATCH\s*-\s*/i, '')
      .toUpperCase();

    if (status === 'LIVE' || status === 'HT') {
      return status;
    }

    if (status === 'FT' || status === 'FINISHED') {
      return 'FT';
    }

    if (/^HALF[\s.\-]?TIME$/.test(status)) {
      return 'HT';
    }

    return null;
  }

  function isTeamName(value) {
    const s = clean(value);

    return !!s &&
      !/^\d+\s*:\s*\d+$/.test(s) &&
      !/^\d{1,3}:\d{2}$/.test(s) &&
      !getStatus(s) &&
      !isAet(s) &&
      !isPens(s) &&
      !/^(Formation|Line-Up|Substitutes|Statistics|Match Commentary|Match Timeline|HOME|CLUB|MANAGEMENT|TACTICS|TRAINING|COMMUNITY)$/i
        .test(s);
  }

  // ==========================================
  // MATCH CLOCK - DESKTOP AND MOBILE
  // ==========================================

  function parseClock(value) {
    const text = clean(value);

    // 67:25, [67:25], 67', 67 min
    const match = text.match(
      /^(?:\[)?(\d{1,3})(?::([0-5]\d)|['’′]|(?:\s*min(?:ute)?s?))\]?$/
    );

    if (!match) return null;

    const minute = Number(match[1]);

    if (!Number.isInteger(minute) || minute > 130) {
      return null;
    }

    return minute;
  }

  function readMatchMinute(lines, scoreIndex, status) {
    if (status !== 'LIVE') {
      return { minute: null, approximate: false };
    }

    // 1. Search for the match clock in the
    // visible match header and event area.
    const end = Math.min(
      lines.length,
      scoreIndex + 180
    );

    for (let i = scoreIndex + 3; i < end; i++) {
      const line = lines[i];

      if (/^Match Commentary$/i.test(line)) {
        break;
      }

      // Avoid timestamps in player substitutions.
      const minute = parseClock(line);

      if (minute !== null && line.includes(':')) {
        return { minute, approximate: false };
      }
    }

    // 2. Mobile fallback: latest commentary entry.
    // This is the minute of the last event,
    // not necessarily the exact current clock.
    const text = document.body.innerText;
    const commentaryAt = text.search(
      /Match commentary/i
    );

    if (commentaryAt >= 0) {
      const commentary = text.slice(
        commentaryAt,
        commentaryAt + 2500
      );

      const event = commentary.match(
        /\[(\d{1,3}):([0-5]\d)\]/
      );

      if (event) {
        const minute = Number(event[1]);

        if (minute <= 130) {
          return { minute, approximate: true };
        }
      }
    }

    return { minute: null, approximate: false };
  }

  // ==========================================
  // READ GAME
  // ==========================================

  function readGame() {
    const id = gameIdFromUrl(location.pathname);

    if (!id) return null;

    const lines = document.body.innerText
      .split('\n')
      .map(clean)
      .filter(Boolean);

    const limit = Math.min(
      lines.length - 1,
      120
    );

    for (let i = 2; i < limit; i++) {
      const status = getStatus(lines[i - 1]);

      if (!status) continue;

      const score = lines[i].match(
        /^(\d+)\s*:\s*(\d+)$/
      );

      if (!score || !isTeamName(lines[i - 2])) {
        continue;
      }

      let away = null;
      let aet = false;
      let pens = null;

      for (
        let j = i + 1;
        j < Math.min(lines.length, i + 10);
        j++
      ) {
        const value = lines[j];

        if (isAet(value)) {
          aet = true;
          continue;
        }

        if (isPens(value)) {
          const p = value.match(
            /(\d+)\s*[:\-]\s*(\d+)/
          );

          pens = p
            ? `pens ${p[1]} : ${p[2]}`
            : null;

          continue;
        }

        if (!away && isTeamName(value)) {
          away = value;
          continue;
        }

        if (away && value === 'Formation') {
          break;
        }
      }

      if (!away) continue;

      const clock = readMatchMinute(
        lines,
        i,
        status
      );

      return {
        gameId: id,
        home: lines[i - 2],
        away,
        homeScore: Number(score[1]),
        awayScore: Number(score[2]),
        status,
        minute: clock.minute,
        minuteApproximate: clock.approximate,
        aet,
        pens,
        url: location.href
      };
    }

    return null;
  }

  // ==========================================
  // GAME TAB PUBLISHER
  // ==========================================

  function startGamePublisher() {
    let tabInfo = null;
    let timer = null;
    let lastData = '';

    function publish(force = false) {
      if (!tabInfo) return;

      const game = readGame();

      if (!game) return;

      const signature = JSON.stringify(game);

      if (!force && signature === lastData) {
        return;
      }

      lastData = signature;

      tabInfo.dlsMatch = game;
      tabInfo.dlsUpdated = Date.now();

      GM_saveTab(tabInfo);
    }

    GM_getTab(tab => {
      tabInfo = tab;
      publish(true);
    });

    const observer = new MutationObserver(() => {
      clearTimeout(timer);

      timer = setTimeout(
        () => publish(),
        300
      );
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true
    });

    setInterval(
      () => publish(true),
      HEARTBEAT_MS
    );

    window.addEventListener('pagehide', () => {
      if (!tabInfo) return;

      tabInfo.dlsMatch = null;
      tabInfo.dlsUpdated = 0;

      GM_saveTab(tabInfo);
    });
  }

  // ==========================================
  // COMPETITION VIEW
  // ==========================================

  function startCompetitionView() {
    const matchStates = new Map();
    const originals = new WeakMap();
    const originalAnnotations = new WeakMap();

    let refreshing = false;

    // ========================================
    // STYLES
    // ========================================

    const style = document.createElement('style');

    style.textContent = `
      .dls-live-score {
        color: #188c43 !important;
        font-weight: 800 !important;
      }

      /* LEAGUE */

      a.do-fixture-vs.dls-live-score,
      a.do-fixture-score.dls-live-score {
        display: inline-flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 2px !important;
        text-align: center !important;
        vertical-align: middle !important;
        white-space: nowrap;
        text-decoration: none !important;
        height: auto !important;
        min-height: 20px;
        min-width: 0 !important;
        padding: 0 !important;
        margin: 0 !important;
        position: relative;
        box-sizing: border-box;
      }

      .do-fixture-teams:has(.dls-live-score) {
        align-items: center !important;
      }

      /* CUP */

      .do-knockout-score:has(.dls-live-score) {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 3px;
        position: relative;
      }

      /* SCORE */

      .dls-score-value {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        white-space: nowrap;
        line-height: 1.2;
        font-weight: 800;
        color: #188c43;
      }

      .dls-digit {
        display: inline-block;
        min-width: .7em;
        text-align: center;
        font: inherit;
        color: inherit;
      }

      .dls-separator {
        display: inline-block;
        padding: 0 4px;
      }

      /* STATUS */

      .dls-status {
        display: block;
        font-size: 10px;
        font-weight: bold;
        line-height: 1.3;
        text-align: center;
        white-space: nowrap;
        color: #777;
        pointer-events: none;
      }

      .dls-status-live {
        color: #188c43;
      }

      .dls-status-ht {
        color: #4777bc;
      }

      .dls-result-note {
        display: block;
        font-size: 10px;
        line-height: 1.3;
        text-align: center;
        color: #777;
        white-space: nowrap;
        pointer-events: none;
      }

      /* DESKTOP GOAL OVERLAY */

      .dls-goal-marker {
        position: absolute !important;
        z-index: 10;
        pointer-events: none;
        display: block;
        width: max-content;
        max-width: none;
        padding: 1px 5px;
        border: 1px solid #83d69d;
        border-radius: 3px;
        background: #dcf8e4;
        color: #117a36;
        font-size: 9px;
        font-weight: 900;
        line-height: 1.2;
        white-space: nowrap;
        box-sizing: border-box;
      }

      a.do-fixture-vs.dls-live-score
        > .dls-goal-marker,
      a.do-fixture-score.dls-live-score
        > .dls-goal-marker {
        left: 50%;
        top: -13px;
        transform: translateX(-50%);
      }

      .do-knockout-score > .dls-goal-marker {
        left: 50%;
        top: -17px;
        transform: translateX(-50%);
      }

      /* MOBILE GOAL INDICATOR */

      .dls-mobile-goal {
        display: none;
        color: #13873c;
        font-size: 10px;
        margin-right: 3px;
        vertical-align: baseline;
      }

      /* PULSING DIGIT */

      @keyframes dls-digit-pulse {
        0%, 100% {
          color: #126e32;
          transform: scale(1);
          text-shadow: none;
        }

        50% {
          color: #00c84b;
          transform: scale(1.35);
          text-shadow:
            0 0 7px rgba(0,190,65,.55);
        }
      }

      .dls-digit-goal {
        color: #168f40 !important;
        font-weight: 900 !important;
        animation:
          dls-digit-pulse
          1.4s ease-in-out infinite;
      }

      .dls-original-hidden {
        display: none !important;
      }

      /* MOBILE LAYOUT */

      @media (max-width: 768px) {
        /* No floating goal overlay on mobile */
        .dls-goal-marker {
          display: none !important;
        }

        .dls-mobile-goal {
          display: inline;
        }

        .dls-status {
          font-size: 10px;
          line-height: 1.2;
          white-space: nowrap;
        }

        .dls-score-value {
          white-space: nowrap;
        }

        .dls-digit {
          min-width: 0.65em;
        }

        /* Preserve normal fixture spacing */
        a.do-fixture-vs.dls-live-score,
        a.do-fixture-score.dls-live-score {
          min-width: 0 !important;
          max-width: 100%;
          padding: 0 !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .dls-digit-goal {
          animation: none;
          text-decoration: underline;
        }
      }
    `;

    document.head.appendChild(style);

    // ========================================
    // FIND MATCH TARGETS
    // ========================================

    function getTargets() {
      const targets = [];

      // League

      for (const link of document.querySelectorAll(
        '.do-fixture-item ' +
        'a.do-fixture-score[href*="gameid/"], ' +
        '.do-fixture-item ' +
        'a.do-fixture-vs[href*="gameid/"]'
      )) {
        const id = gameIdFromUrl(link.href);

        if (!id) continue;

        targets.push({
          id,
          type: 'league',
          scoreElement: link,
          noteParent: link,
          goalParent: link
        });
      }

      // Cup

      for (const link of document.querySelectorAll(
        '.do-knockout-match-inner ' +
        'a.do-match-stretch-link[href*="gameid/"]'
      )) {
        const id = gameIdFromUrl(link.href);
        const row = link.closest(
          '.do-knockout-match-inner'
        );

        const scoreElement = row?.querySelector(
          '.do-knockout-result'
        );

        const noteParent = row?.querySelector(
          '.do-knockout-score'
        );

        if (id && scoreElement && noteParent) {
          targets.push({
            id,
            type: 'cup',
            scoreElement,
            noteParent,
            goalParent: noteParent
          });
        }
      }

      return targets;
    }

    // ========================================
    // ORIGINAL ELEMENTS
    // ========================================

    function rememberOriginal(target) {
      const element = target.scoreElement;

      if (!originals.has(element)) {
        originals.set(element, {
          html: element.innerHTML,
          className: element.className
        });
      }
    }

    function isResultAnnotation(value) {
      const s = clean(value);

      return (
        /\ba\.?e\.?t\.?\b/i.test(s) ||
        /\bpens?\b/i.test(s) ||
        /^\(?\d+\s*[-:]\s*\d+\s*(?:p|aet)\)?$/i
          .test(s)
      );
    }

    function rememberCupAnnotations(target) {
      if (
        target.type !== 'cup' ||
        originalAnnotations.has(target.noteParent)
      ) {
        return;
      }

      const parent = target.noteParent;
      const nodes = [];

      for (const child of [...parent.childNodes]) {
        if (child === target.scoreElement) {
          continue;
        }

        if (child.nodeType === Node.ELEMENT_NODE) {
          if (
            child.dataset.dlsNote === '1' ||
            child.contains(target.scoreElement)
          ) {
            continue;
          }

          if (isResultAnnotation(child.textContent)) {
            nodes.push(child);
          }
        } else if (
          child.nodeType === Node.TEXT_NODE &&
          isResultAnnotation(child.textContent)
        ) {
          const span = document.createElement('span');

          span.textContent = child.textContent;
          parent.replaceChild(span, child);
          nodes.push(span);
        }
      }

      originalAnnotations.set(parent, nodes);
    }

    function showOriginalAnnotations(
      target,
      visible
    ) {
      if (target.type !== 'cup') return;

      rememberCupAnnotations(target);

      for (
        const node of
        originalAnnotations.get(target.noteParent) || []
      ) {
        node.classList.toggle(
          'dls-original-hidden',
          !visible
        );
      }
    }

    // ========================================
    // NOTES
    // ========================================

    function removeNotes(target) {
      const parents = new Set(
        [target.noteParent, target.goalParent]
          .filter(Boolean)
      );

      for (const parent of parents) {
        for (const node of parent.querySelectorAll(
          '[data-dls-note="1"]'
        )) {
          if (node.parentElement === parent) {
            node.remove();
          }
        }
      }
    }

    function note(parent, cls, text) {
      const node = document.createElement('span');

      node.dataset.dlsNote = '1';
      node.className = cls;
      node.textContent = text;

      parent.appendChild(node);

      return node;
    }

    function restoreTarget(target) {
      const element = target.scoreElement;
      const original = originals.get(element);

      if (!original) return;

      removeNotes(target);

      if (
        element.className !== original.className ||
        element.innerHTML !== original.html
      ) {
        element.innerHTML = original.html;
        element.className = original.className;
      }

      showOriginalAnnotations(target, true);
    }

    // ========================================
    // SCORE DIGITS
    // ========================================

    function renderDigits(target, game, goalSide) {
      const score = target.scoreElement;

      const wrapper = document.createElement('span');
      wrapper.className = 'dls-score-value';

      const home = document.createElement('span');
      home.className = 'dls-digit';
      home.textContent = game.homeScore;

      const separator = document.createElement('span');
      separator.className = 'dls-separator';
      separator.textContent = ' - ';

      const away = document.createElement('span');
      away.className = 'dls-digit';
      away.textContent = game.awayScore;

      if (
        goalSide === 'home' ||
        goalSide === 'both'
      ) {
        home.classList.add('dls-digit-goal');
      }

      if (
        goalSide === 'away' ||
        goalSide === 'both'
      ) {
        away.classList.add('dls-digit-goal');
      }

      wrapper.append(home, separator, away);

      score.replaceChildren(wrapper);
      score.classList.add('dls-live-score');
    }

    // ========================================
    // DISPLAY MATCH
    // ========================================

    function displayMatch(target, game, goalSide) {
      rememberOriginal(target);
      showOriginalAnnotations(target, false);
      removeNotes(target);

      renderDigits(target, game, goalSide);

      let statusClass = 'dls-status';
      let statusText = game.status;

      if (game.status === 'LIVE') {
        statusClass += ' dls-status-live';

        if (Number.isInteger(game.minute)) {
          const prefix = game.minuteApproximate
            ? '~'
            : '';

          statusText =
            `LIVE · ${prefix}${game.minute}'`;
        }
      } else if (game.status === 'HT') {
        statusClass += ' dls-status-ht';
      }

      const status = note(
        target.noteParent,
        statusClass,
        statusText
      );

      // On mobile show a small goal icon inline
      // with the match status, not as an overlay.
      if (goalSide) {
        const mobileGoal = document.createElement('span');

        mobileGoal.className = 'dls-mobile-goal';
        mobileGoal.textContent = '⚽';
        mobileGoal.title = 'GOOOL!';

        status.prepend(mobileGoal);
      }

      if (game.aet) {
        note(
          target.noteParent,
          'dls-result-note',
          'a.e.t.'
        );
      }

      if (game.pens) {
        note(
          target.noteParent,
          'dls-result-note',
          game.pens
        );
      }

      if (goalSide && target.goalParent) {
        note(
          target.goalParent,
          'dls-goal-marker',
          '⚽ GOOOL!'
        );
      }
    }

    // ========================================
    // GET MATCHES
    // ========================================

    function getLiveMatches(tabs) {
      const matches = new Map();
      const now = Date.now();

      for (const tab of Object.values(tabs || {})) {
        const game = tab.dlsMatch;

        if (!game?.gameId) continue;

        const updated = Number(
          tab.dlsUpdated || 0
        );

        if (now - updated > STALE_MS) {
          continue;
        }

        const id = String(game.gameId);
        const previous = matches.get(id);

        if (
          !previous ||
          updated > previous.updated
        ) {
          matches.set(id, { game, updated });
        }
      }

      return matches;
    }

    // ========================================
    // GOAL DETECTION
    // ========================================

    function updateGoalState(id, game, now) {
      const current = {
        home: game.homeScore,
        away: game.awayScore
      };

      const previous = matchStates.get(id);

      if (!previous) {
        matchStates.set(id, {
          ...current,
          goalUntil: 0,
          goalSide: null
        });

        return null;
      }

      let { goalUntil, goalSide } = previous;

      const homeDiff =
        current.home - previous.home;

      const awayDiff =
        current.away - previous.away;

      if (homeDiff > 0 || awayDiff > 0) {
        goalSide =
          homeDiff > 0 && awayDiff === 0
            ? 'home'
            : awayDiff > 0 && homeDiff === 0
              ? 'away'
              : 'both';

        goalUntil = now + GOAL_MS;
      }

      if (homeDiff < 0 || awayDiff < 0) {
        goalUntil = 0;
        goalSide = null;
      }

      if (now >= goalUntil) {
        goalSide = null;
      }

      matchStates.set(id, {
        ...current,
        goalUntil,
        goalSide
      });

      return now < goalUntil
        ? goalSide
        : null;
    }

    // ========================================
    // REFRESH
    // ========================================

    function refresh() {
      if (refreshing) return;

      refreshing = true;

      try {
        GM_getTabs(tabs => {
          try {
            const matches = getLiveMatches(tabs);
            const targets = getTargets();
            const now = Date.now();
            const goalStates = new Map();

            for (const target of targets) {
              const record = matches.get(target.id);

              if (!record) {
                restoreTarget(target);
                continue;
              }

              if (!goalStates.has(target.id)) {
                goalStates.set(
                  target.id,
                  updateGoalState(
                    target.id,
                    record.game,
                    now
                  )
                );
              }

              displayMatch(
                target,
                record.game,
                goalStates.get(target.id)
              );
            }
          } catch (error) {
            console.error(
              '[Dugout Live Scores] Render error:',
              error
            );
          } finally {
            refreshing = false;
          }
        });
      } catch (error) {
        refreshing = false;

        console.error(
          '[Dugout Live Scores] Read error:',
          error
        );
      }
    }

    refresh();

    setInterval(refresh, REFRESH_MS);

    console.info(
      '[Dugout Live Scores] v0.4.7 active',
      location.pathname
    );
  }

  // ==========================================
  // START
  // ==========================================

  if (isGame) {
    startGamePublisher();
  }

  if (isCompetition) {
    startCompetitionView();
  }

})();
