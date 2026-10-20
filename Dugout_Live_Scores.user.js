// ==UserScript==
// @name         Dugout Live Scores
// @namespace    dugout-live-scores
// @version      0.4.5
// @description  Live scores on Dugout competition pages (no extra game requests)
// @match        https://dugout-online.com/game/*
// @match        https://www.dugout-online.com/game/*
// @match        https://dugout-online.com/competitions/*
// @match        https://www.dugout-online.com/competitions/*
// @grant        GM_getTab
// @grant        GM_saveTab
// @grant        GM_getTabs
// @updateURL    https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores.user.js
// @downloadURL  https://raw.githubusercontent.com/zamorrr/do-live-scores/main/Dugout_Live_Scores.user.js
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';
  if (window.top !== window.self) return;

  const STALE_MS = 20000;
  const GOAL_MS = 60000;
  const REFRESH_MS = 2000;
  const HEARTBEAT_MS = 5000;
  const isGame = /\/game\/.*gameid\/\d+/.test(location.pathname);
  const isCompetition = /^\/competitions\/none(?:\/|$)/.test(location.pathname);
  if (!isGame && !isCompetition) return;

  const clean = x => String(x || '').replace(/\s+/g, ' ').trim();
  const gameIdFromUrl = x => String(x || '').match(/gameid\/(\d+)/i)?.[1] || null;
  const isAet = x => /^a\.?e\.?t\.?$/i.test(clean(x));
  const isPens = x => /^(?:pens?|penalties)\s+\d+\s*[:\-]\s*\d+$/i.test(clean(x));
  function getStatus(x) {
    const s = clean(x).replace(/^MATCH\s*-\s*/i, '').toUpperCase();
    if (s === 'LIVE' || s === 'HT') return s;
    if (s === 'FT' || s === 'FINISHED') return 'FT';
    if (/^HALF[\s.\-]?TIME$/.test(s)) return 'HT';
    return null;
  }
  function isTeamName(x) {
    const s = clean(x);
    return !!s && !/^\d+\s*:\s*\d+$/.test(s) && !/^\d{1,3}:\d{2}$/.test(s) &&
      !getStatus(s) && !isAet(s) && !isPens(s) &&
      !/^(Formation|Line-Up|Substitutes|Statistics|Match Commentary|Match Timeline|HOME|CLUB|MANAGEMENT|TACTICS|TRAINING|COMMUNITY)$/i.test(s);
  }
  function readMatchMinute(lines, index, status) {
    if (status !== 'LIVE') return null;
    for (let i = index + 3; i < Math.min(lines.length, index + 160); i++) {
      if (/^Match Commentary$/i.test(lines[i])) break;
      const m = lines[i].match(/^(\d{1,3}):([0-5]\d)$/);
      if (m && Number(m[1]) <= 130) return Number(m[1]);
    }
    return null;
  }
  function readGame() {
    const id = gameIdFromUrl(location.pathname);
    if (!id) return null;
    const lines = document.body.innerText.split('\n').map(clean).filter(Boolean);
    for (let i = 2; i < Math.min(lines.length - 1, 100); i++) {
      const status = getStatus(lines[i - 1]);
      const score = lines[i].match(/^(\d+)\s*:\s*(\d+)$/);
      if (!status || !score || !isTeamName(lines[i - 2])) continue;
      let away = null, aet = false, pens = null;
      for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
        const v = lines[j];
        if (isAet(v)) { aet = true; continue; }
        if (isPens(v)) {
          const p = v.match(/(\d+)\s*[:\-]\s*(\d+)/);
          pens = p ? `pens ${p[1]} : ${p[2]}` : null;
          continue;
        }
        if (!away && isTeamName(v)) { away = v; continue; }
        if (away && v === 'Formation') break;
      }
      if (!away) continue;
      return {gameId: id, home: lines[i - 2], away,
        homeScore: Number(score[1]), awayScore: Number(score[2]),
        status, minute: readMatchMinute(lines, i, status), aet, pens, url: location.href};
    }
    return null;
  }

  function startGamePublisher() {
    let tabInfo = null, timer = null, lastData = '';
    function publish(force = false) {
      if (!tabInfo) return;
      const game = readGame();
      if (!game) return;
      const signature = JSON.stringify(game);
      if (!force && signature === lastData) return;
      lastData = signature;
      tabInfo.dlsMatch = game;
      tabInfo.dlsUpdated = Date.now();
      GM_saveTab(tabInfo);
    }
    GM_getTab(tab => { tabInfo = tab; publish(true); });
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => publish(), 300);
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true});
    setInterval(() => publish(true), HEARTBEAT_MS);
    window.addEventListener('pagehide', () => {
      if (!tabInfo) return;
      tabInfo.dlsMatch = null;
      tabInfo.dlsUpdated = 0;
      GM_saveTab(tabInfo);
    });
  }

  function startCompetitionView() {
    const matchStates = new Map();
    const originals = new WeakMap();
    const originalAnnotations = new WeakMap();
    let refreshing = false;

    const style = document.createElement('style');
    style.textContent = `
      .dls-live-score { color:#188c43 !important; font-weight:800 !important; }
      a.do-fixture-vs.dls-live-score, a.do-fixture-score.dls-live-score {
        display:inline-flex !important; flex-direction:column !important;
        align-items:center !important; justify-content:center !important;
        gap:2px !important; text-align:center !important; vertical-align:middle;
        white-space:nowrap; text-decoration:none !important; height:auto !important; min-height:20px;
        min-width:0 !important; padding:0 !important; margin:0 !important; position:relative;
      }
      .do-fixture-teams:has(.dls-live-score) { align-items:center !important; }
      .do-knockout-score:has(.dls-live-score) {
        display:flex !important; flex-direction:column !important;
        align-items:center !important; justify-content:center !important;
        gap:3px; position:relative;
      }
      .dls-score-value { display:inline-flex; align-items:baseline; justify-content:center;
        white-space:nowrap; line-height:1.2; font-weight:800; color:#188c43; }
      .dls-digit { display:inline-block; min-width:.7em; text-align:center; color:inherit; font:inherit; }
      .dls-separator { display:inline-block; padding:0 4px; }
      .dls-status { display:block; font-size:10px; font-weight:bold; line-height:1.3;
        text-align:center; white-space:nowrap; color:#777; pointer-events:none; }
      .dls-status-live { color:#188c43; }
      .dls-status-ht { color:#4777bc; }
      .dls-result-note { display:block; font-size:10px; line-height:1.3;
        text-align:center; color:#777; white-space:nowrap; pointer-events:none; }
      /* Goal marker overlays score in league and cup without affecting row height. */
      .dls-goal-marker {
        position:absolute !important; z-index:5; pointer-events:none;
        display:block; width:max-content; padding:2px 5px;
        border:1px solid #83d69d; border-radius:4px;
        background:#dcf8e4; color:#117a36; font-size:10px;
        font-weight:900; line-height:1.3; white-space:nowrap;
        box-sizing:border-box;
      }
      /* Overlay above the center score in both competition layouts. */
      a.do-fixture-vs.dls-live-score > .dls-goal-marker,
      a.do-fixture-score.dls-live-score > .dls-goal-marker,
      .do-knockout-score > .dls-goal-marker {
        left:50%; right:auto; top:-13px; transform:translateX(-50%);
      }
      @keyframes dls-digit-pulse {
        0%,100% { color:#126e32; transform:scale(1); text-shadow:none; }
        50% { color:#00c84b; transform:scale(1.35); text-shadow:0 0 7px rgba(0,190,65,.55); }
      }
      .dls-digit-goal { color:#168f40 !important; font-weight:900 !important;
        animation:dls-digit-pulse 1.4s ease-in-out infinite; }
      .dls-original-hidden { display:none !important; }
      @media(prefers-reduced-motion:reduce) { .dls-digit-goal { animation:none; text-decoration:underline; } }
    `;
    document.head.appendChild(style);

    function getTargets() {
      const targets = [];
      for (const link of document.querySelectorAll(
        '.do-fixture-item a.do-fixture-score[href*="gameid/"], .do-fixture-item a.do-fixture-vs[href*="gameid/"]'
      )) {
        const id = gameIdFromUrl(link.href);
        if (id) targets.push({id, type:'league', scoreElement:link,
          noteParent:link, goalParent:link});
      }
      for (const link of document.querySelectorAll(
        '.do-knockout-match-inner a.do-match-stretch-link[href*="gameid/"]'
      )) {
        const id = gameIdFromUrl(link.href);
        const row = link.closest('.do-knockout-match-inner');
        const scoreElement = row?.querySelector('.do-knockout-result');
        const noteParent = row?.querySelector('.do-knockout-score');
        if (id && scoreElement && noteParent) {
          targets.push({id, type:'cup', scoreElement, noteParent, goalParent:noteParent});
        }
      }
      return targets;
    }
    function rememberOriginal(target) {
      const el = target.scoreElement;
      if (!originals.has(el)) originals.set(el, {html:el.innerHTML, className:el.className});
    }
    function isResultAnnotation(value) {
      const s = clean(value);
      return /\ba\.?e\.?t\.?\b/i.test(s) || /\bpens?\b/i.test(s) ||
        /^\(?\d+\s*[-:]\s*\d+\s*(?:p|aet)\)?$/i.test(s);
    }
    function rememberCupAnnotations(target) {
      if (target.type !== 'cup' || originalAnnotations.has(target.noteParent)) return;
      const parent = target.noteParent, nodes = [];
      for (const child of [...parent.childNodes]) {
        if (child === target.scoreElement) continue;
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.dataset.dlsNote === '1' || child.contains(target.scoreElement)) continue;
          if (isResultAnnotation(child.textContent)) nodes.push(child);
        } else if (child.nodeType === Node.TEXT_NODE && isResultAnnotation(child.textContent)) {
          const span = document.createElement('span');
          span.textContent = child.textContent;
          parent.replaceChild(span, child);
          nodes.push(span);
        }
      }
      originalAnnotations.set(parent, nodes);
    }
    function showOriginalAnnotations(target, visible) {
      if (target.type !== 'cup') return;
      rememberCupAnnotations(target);
      for (const node of originalAnnotations.get(target.noteParent) || []) {
        node.classList.toggle('dls-original-hidden', !visible);
      }
    }
    function removeNotes(target) {
      // Remove only notes belonging to this match; do not touch other links/rows.
      for (const parent of [target.noteParent, target.goalParent]) {
        if (!parent) continue;
        for (const node of parent.querySelectorAll('[data-dls-note="1"]')) {
          if (node.parentElement === parent) node.remove();
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
      const el = target.scoreElement, original = originals.get(el);
      if (!original) return;
      removeNotes(target);
      if (el.className !== original.className || el.innerHTML !== original.html) {
        el.innerHTML = original.html;
        el.className = original.className;
      }
      showOriginalAnnotations(target, true);
    }
    function renderDigits(target, game, goalSide) {
      const score = target.scoreElement;
      const wrapper = document.createElement('span'); wrapper.className = 'dls-score-value';
      const home = document.createElement('span'); home.className = 'dls-digit'; home.textContent = game.homeScore;
      const sep = document.createElement('span'); sep.className = 'dls-separator'; sep.textContent = ' - ';
      const away = document.createElement('span'); away.className = 'dls-digit'; away.textContent = game.awayScore;
      if (goalSide === 'home' || goalSide === 'both') home.classList.add('dls-digit-goal');
      if (goalSide === 'away' || goalSide === 'both') away.classList.add('dls-digit-goal');
      wrapper.append(home, sep, away);
      score.replaceChildren(wrapper);
      score.classList.add('dls-live-score');
    }
    function displayMatch(target, game, goalSide) {
      rememberOriginal(target);
      showOriginalAnnotations(target, false);
      removeNotes(target);
      renderDigits(target, game, goalSide);
      let statusClass = 'dls-status', statusText = game.status;
      if (game.status === 'LIVE') {
        statusClass += ' dls-status-live';
        if (Number.isInteger(game.minute)) statusText = `LIVE · ${game.minute}'`;
      } else if (game.status === 'HT') statusClass += ' dls-status-ht';
      note(target.noteParent, statusClass, statusText);
      if (game.aet) note(target.noteParent, 'dls-result-note', 'a.e.t.');
      if (game.pens) note(target.noteParent, 'dls-result-note', game.pens);
      if (goalSide && target.goalParent) {
        note(target.goalParent, 'dls-goal-marker', '⚽ GOOOL!');
      }
    }
    function getLiveMatches(tabs) {
      const matches = new Map(), now = Date.now();
      for (const tab of Object.values(tabs || {})) {
        const game = tab.dlsMatch;
        if (!game?.gameId) continue;
        const updated = Number(tab.dlsUpdated || 0);
        if (now - updated > STALE_MS) continue;
        const id = String(game.gameId), previous = matches.get(id);
        if (!previous || updated > previous.updated) matches.set(id, {game, updated});
      }
      return matches;
    }
    function updateGoalState(id, game, now) {
      const current = {home: game.homeScore, away: game.awayScore};
      const previous = matchStates.get(id);
      if (!previous) {
        matchStates.set(id, {...current, goalUntil:0, goalSide:null});
        return null;
      }
      let {goalUntil, goalSide} = previous;
      const homeDiff = current.home - previous.home;
      const awayDiff = current.away - previous.away;
      if (homeDiff > 0 || awayDiff > 0) {
        goalSide = homeDiff > 0 && awayDiff === 0 ? 'home'
          : awayDiff > 0 && homeDiff === 0 ? 'away' : 'both';
        goalUntil = now + GOAL_MS;
      }
      if (homeDiff < 0 || awayDiff < 0) { goalUntil = 0; goalSide = null; }
      if (now >= goalUntil) goalSide = null;
      matchStates.set(id, {...current, goalUntil, goalSide});
      return now < goalUntil ? goalSide : null;
    }
    function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        GM_getTabs(tabs => {
          try {
            const matches = getLiveMatches(tabs), targets = getTargets();
            const now = Date.now(), goalStates = new Map();
            for (const target of targets) {
              const record = matches.get(target.id);
              if (!record) { restoreTarget(target); continue; }
              if (!goalStates.has(target.id)) {
                goalStates.set(target.id, updateGoalState(target.id, record.game, now));
              }
              displayMatch(target, record.game, goalStates.get(target.id));
            }
          } catch (error) {
            console.error('[Dugout Live Scores] Render error:', error);
          } finally { refreshing = false; }
        });
      } catch (error) {
        refreshing = false;
        console.error('[Dugout Live Scores] Read error:', error);
      }
    }
    refresh();
    setInterval(refresh, REFRESH_MS);
    console.info('[Dugout Live Scores] v0.4.5 active', location.pathname);
  }

  if (isGame) startGamePublisher();
  if (isCompetition) startCompetitionView();
})();
