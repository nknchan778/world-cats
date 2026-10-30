/* 世界中のねこちゃ～ん ─ メインのプログラム
   やっていること:
   1. videos.js の文字を1行ずつ読み取る(URLからSNSを判別)
   2. 動画カードを作る
   3. キーワード検索・タグページの表示
   4. 画面に近づいたカードだけ、SNSの公式の埋め込みを読み込む(動画が増えても重くならないように)
*/
(function () {
  'use strict';

  // ---------- 設定 ----------
  const PAGE_SIZE = 12;            // 最初に出す本数 / 「もっと見る」で増える本数
  const LOAD_MARGIN = '700px 0px'; // 画面の何px手前から埋め込みを読み込み始めるか
  const TAGS_COLLAPSED = 18;       // トップで最初に見せるタグの数
  const SITE_NAME = '世界中のねこちゃ～ん';
  const AUTHOR_CACHE_KEY = 'neko-author-cache-v1';
  const SORT_KEY = 'neko-sort-v1';  // 「ランダム/新着順」の選択を覚えておく場所
  const LOADING_TEXT ='読み込み中… 表示されないときは、下のボタンから見られます';

  const SNS = {
    youtube:   { label: 'YouTube',   alias: 'youtube ユーチューブ ようつべ' },
    instagram: { label: 'Instagram', alias: 'instagram インスタ インスタグラム' },
    x:         { label: 'X',         alias: 'x twitter ツイッター ツイート' },
    tiktok:    { label: 'TikTok',    alias: 'tiktok ティックトック' },
    threads:   { label: 'Threads',   alias: 'threads スレッズ' },
  };

  // ---------- 小さな道具 ----------
  const $ = (id) => document.getElementById(id);

  // 画面の部品を安全に作る(文字は textContent として入れるので、変な文字が混ざっても大丈夫)
  function h(tag, attrs, ...kids) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === false || v == null) return;
      if (k === 'class') node.className = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    kids.flat().forEach((kid) => { if (kid != null && kid !== false) node.append(kid); });
    return node;
  }

  // 検索用に文字をそろえる(全角/半角・大文字/小文字・カタカナ/ひらがなの違いを無視する)
  function norm(s) {
    return String(s).normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  }

  function tagUrl(name) { return 'tag.html?tag=' + encodeURIComponent(name); }

  function safeDecode(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  function profileUrl(sns, name) {
    if (!/^[\w.]+$/.test(name)) return ''; // 変な名前のときはリンクにしない
    switch (sns) {
      case 'x':         return 'https://x.com/' + name;
      case 'instagram': return 'https://www.instagram.com/' + name + '/';
      case 'tiktok':    return 'https://www.tiktok.com/@' + name;
      case 'threads':   return 'https://www.threads.com/@' + name;
      default:          return '';
    }
  }

  // ---------- 1. URLから、SNSの種類・動画ID・埋め込み用アドレスを調べる ----------
  function detect(rawUrl) {
    let u;
    try { u = new URL(rawUrl); } catch (e) { throw new Error('URLの形が正しくありません'); }
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '');
    const parts = u.pathname.split('/').filter(Boolean).map(safeDecode);

    // YouTube
    if (host === 'youtu.be' || host === 'youtube.com' || host === 'youtube-nocookie.com') {
      let id = '';
      let isShorts = false;
      if (host === 'youtu.be') id = parts[0] || '';
      else if (parts[0] === 'watch') id = u.searchParams.get('v') || '';
      else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) { id = parts[1] || ''; isShorts = parts[0] === 'shorts'; }
      if (!/^[\w-]{11}$/.test(id)) throw new Error('YouTubeの動画が見つかりません(動画かショート動画のURLを貼ってください)');
      return {
        sns: 'youtube', id, canEmbed: true,
        link: isShorts ? 'https://www.youtube.com/shorts/' + id : 'https://www.youtube.com/watch?v=' + id,
        embed: 'https://www.youtube.com/embed/' + id + '?playsinline=1&rel=0',
        author: '',
      };
    }

    // Instagram
    if (host === 'instagram.com' || host === 'instagr.am') {
      const i = parts.findIndex((p, idx) => idx <= 1 && ['reel', 'reels', 'p', 'tv'].includes(p));
      const code = i >= 0 ? parts[i + 1] : '';
      if (!/^[\w-]+$/.test(code || '')) throw new Error('Instagramの投稿(リール)のURLではないようです');
      const kind = parts[i] === 'reels' ? 'reel' : parts[i];
      const base = 'https://www.instagram.com/' + kind + '/' + code + '/';
      return { sns: 'instagram', id: code, canEmbed: true, link: base, embed: base + 'embed/', author: i === 1 ? parts[0] : '' };
    }

    // X(旧Twitter)
    if (host === 'x.com' || host === 'twitter.com') {
      const si = parts.findIndex((p) => p === 'status' || p === 'statuses');
      const id = si >= 0 ? (parts[si + 1] || '') : '';
      if (!/^\d+$/.test(id)) throw new Error('Xの投稿のURLではないようです(…/status/数字 の形)');
      const user = si === 1 && parts[0] !== 'i' ? parts[0] : '';
      return { sns: 'x', id, canEmbed: true, link: 'https://x.com/' + (user || 'i') + '/status/' + id, author: user };
    }

    // TikTok
    if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
      if (parts[0] && parts[0][0] === '@' && parts[1] === 'video' && /^\d+$/.test(parts[2] || '')) {
        const user = parts[0].slice(1);
        const id = parts[2];
        return {
          sns: 'tiktok', id, canEmbed: true,
          link: 'https://www.tiktok.com/@' + user + '/video/' + id,
          embed: 'https://www.tiktok.com/embed/v2/' + id, author: user,
        };
      }
      if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || parts[0] === 't') {
        return {
          sns: 'tiktok', id: 'short:' + host + u.pathname, canEmbed: false, author: '',
          link: u.origin + u.pathname,
          noEmbedReason: 'TikTokの短縮URLは埋め込めません。下のボタンから見てね(埋め込むには、…/@名前/video/数字 の長いURLを使います)',
        };
      }
      throw new Error('TikTokの動画のURLではないようです(…/@名前/video/数字 の形)');
    }

    // Threads
    if (host === 'threads.net' || host === 'threads.com') {
      const user = parts[0] && parts[0][0] === '@' ? parts[0].slice(1) : '';
      const code = parts[1] === 'post' ? parts[2] : '';
      if (!user || !/^[\w-]+$/.test(code || '')) throw new Error('Threadsの投稿のURLではないようです(…/@名前/post/英数字 の形)');
      const base = 'https://www.threads.com/@' + user + '/post/' + code;
      return { sns: 'threads', id: code, canEmbed: true, link: base, embed: base + '/embed', author: user };
    }

    throw new Error('対応していないURLです(Instagram / X / YouTube / TikTok / Threads のURLを貼ってください)');
  }

  // ---------- 2. videos.js の1行を読み取る ----------
  const URL_RE = /https?:\/\/[A-Za-z0-9\-._~:\/?#[\]@!$&'()*+,;=%]+/;

  function parseLine(raw) {
    const text = raw.normalize('NFKC').trim(); // 全角の英数字や記号を半角にそろえる
    const m = text.match(URL_RE);
    if (!m) throw new Error('URL(httpから始まるアドレス)が見つかりません');
    const url = m[0].replace(/[.,;)]+$/, '');
    const rest = text.replace(m[0], ' ');
    if (/https?:\/\//i.test(rest)) throw new Error('1行にURLが2つあります。1行に1本にしてください');

    const info = detect(url);

    const tags = [];
    const seen = new Set();
    let manualAuthor = '';
    rest.split(/[\s,、;]+/).filter(Boolean).forEach((tok) => {
      if (tok[0] === '@') { manualAuthor = tok.slice(1); return; }
      const name = tok.replace(/^#+/, '');
      if (!name) return;
      const key = norm(name);
      if (seen.has(key)) return;
      seen.add(key);
      tags.push({ name, key });
    });

    const authorName = manualAuthor || info.author;
    return Object.assign({}, info, {
      tags,
      authorLabel: authorName ? '@' + authorName : '',
      authorUrl: authorName ? profileUrl(info.sns, authorName) : '',
    });
  }

  // 並び順をランダムにする。同じ訪問(同じタブ)の間は同じ並びにして、タグのページから戻ったときに迷わないようにする
  function getShuffleSeed() {
    const fresh = () => Math.floor(Math.random() * 2147483647) + 1;
    try {
      let s = Number(sessionStorage.getItem('neko-shuffle-seed'));
      if (!s) { s = fresh(); sessionStorage.setItem('neko-shuffle-seed', String(s)); }
      return s;
    } catch (e) { return fresh(); }
  }

  function shuffle(list, seed) {
    let a = seed >>> 0;
    const rand = () => { // 小さな乱数のしくみ(mulberry32)。同じ数字からは同じ並びになる
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  function loadVideos() {
    const problems = [];
    const videos = [];
    if (typeof VIDEO_LIST !== 'string') {
      problems.push({ text: '(videos.js 全体)', reason: 'videos.js を読み込めませんでした。ファイルの最初と最後の ` (バッククォート)が消えていないか確認してください' });
      return { videos, problems };
    }
    const seen = new Set();
    VIDEO_LIST.split(/\r?\n/).forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith('//')) return;
      try {
        const v = parseLine(t);
        const key = v.sns + ':' + v.id;
        if (seen.has(key)) throw new Error('同じ動画がすでに書かれています');
        seen.add(key);
        v.fileIndex = videos.length; // videos.js の行の順(下の行ほど大きい=新しい)
        videos.push(v);
      } catch (e) {
        problems.push({ text: t, reason: e.message });
      }
    });
    if (problems.length) console.warn('[ねこちゃ～ん] 読み込めなかった行:', problems);
    return { videos, problems };
  }

  function buildTagIndex(videos) {
    const map = new Map();
    videos.forEach((v) => v.tags.forEach((t) => {
      let e = map.get(t.key);
      if (!e) { e = { key: t.key, name: t.name, count: 0 }; map.set(t.key, e); }
      e.count += 1;
    }));
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ja'));
  }

  // ---------- 3. 投稿者名のメモ(YouTubeなど、公式の仕組みで調べたものを覚えておく) ----------
  function readCache() {
    try { return JSON.parse(localStorage.getItem(AUTHOR_CACHE_KEY)) || {}; } catch (e) { return {}; }
  }
  function writeCache(obj) {
    try { localStorage.setItem(AUTHOR_CACHE_KEY, JSON.stringify(obj)); } catch (e) { /* 保存できなくても困らない */ }
  }
  const authorCache = readCache();

  // ---------- 4. 動画カードを作る ----------
  function buildHaystack(v) {
    return norm([v.tags.map((t) => t.name).join(' '), v.authorLabel, SNS[v.sns].label, SNS[v.sns].alias].join(' '));
  }

  // 投稿者名を、指定した入れ物の中に書き込む
  function fillAuthor(box, v) {
    box.textContent = '';
    if (v.authorLabel) {
      box.append(v.authorUrl
        ? h('a', { href: v.authorUrl, target: '_blank', rel: 'noopener noreferrer' }, v.authorLabel)
        : v.authorLabel);
    } else {
      box.append(h('a', { class: 'author-unknown', href: v.link, target: '_blank', rel: 'noopener noreferrer' }, '投稿者は元の投稿で確認'));
    }
  }

  function renderAuthor(entry) {
    fillAuthor(entry.authorBox, entry.video);
  }

  // 埋め込みが出るまで(または出なかったとき)に見せる、足あとつきの枠
  function makeNote(v) {
    return h('div', { class: 'embed__note' },
      h('span', { class: 'embed__paw', 'aria-hidden': 'true' }, '🐾'),
      h('span', { class: 'embed__msg' }, v.canEmbed ? LOADING_TEXT : v.noEmbedReason));
  }

  function makeEntry(v) {
    try {
      const authorBox = h('span', { class: 'card__author' });
      const note = makeNote(v);
      const embedBox = h('div', { class: 'embed embed--' + (v.canEmbed ? v.sns : 'linkonly') }, note);

      const el = h('article', { class: 'card' },
        h('div', { class: 'card__head' }, h('span', { class: 'badge sns-' + v.sns }, SNS[v.sns].label), authorBox),
        embedBox,
        v.tags.length ? h('ul', { class: 'card__tags' },
          v.tags.map((t) => h('li', null, h('a', { class: 'chip chip--small', href: tagUrl(t.name) }, '#' + t.name)))) : null,
        // 埋め込みが表示できなくても、このリンクは必ず出る
        h('a', { class: 'btn btn--block card__link', href: v.link, target: '_blank', rel: 'noopener noreferrer' },
          '元の投稿を見る ', h('span', { 'aria-hidden': 'true' }, '↗')));

      const entry = { video: v, el, embedBox, note, authorBox, hay: '', mounted: false, authorTried: false };
      const cached = authorCache[v.link];
      if (!v.authorLabel && cached) { v.authorLabel = cached.name; v.authorUrl = cached.url; }
      entry.hay = buildHaystack(v);
      renderAuthor(entry);
      el.__entry = entry;
      return entry;
    } catch (e) {
      console.warn('[ねこちゃ～ん] カードを作れませんでした:', v.link, e);
      return null;
    }
  }

  // ---------- 5. 埋め込みを読み込む(画面に近づいたカードだけ) ----------
  let twitterPromise = null;
  function loadTwitter() {
    if (!twitterPromise) {
      twitterPromise = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://platform.twitter.com/widgets.js';
        s.async = true;
        s.onload = () => (window.twttr && window.twttr.widgets ? resolve(window.twttr) : reject(new Error('twttr missing')));
        s.onerror = () => reject(new Error('widgets.js blocked'));
        document.head.append(s);
      });
    }
    return twitterPromise;
  }

  // InstagramやThreadsは、埋め込みの高さを postMessage(別の窓への連絡)で教えてくれる
  const measureFrames = [];
  window.addEventListener('message', (ev) => {
    if (!/^https:\/\/([a-z0-9-]+\.)*(instagram\.com|threads\.net|threads\.com)$/i.test(ev.origin)) return;
    let d = ev.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { return; } }
    if (!d || d.type !== 'MEASURE' || !d.details || !(d.details.height > 0)) return;
    const f = measureFrames.find((fr) => fr.contentWindow === ev.source);
    if (f && f.parentElement) f.parentElement.style.height = Math.min(Math.ceil(d.details.height), 1600) + 'px';
  });

  function showFailed(entry, message) {
    entry.note.hidden = false;
    entry.note.querySelector('.embed__msg').textContent = message;
  }

  function mountIframe(entry) {
    const v = entry.video;
    const f = h('iframe', {
      src: v.embed,
      title: SNS[v.sns].label + 'の猫動画',
      allow: 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen',
      allowfullscreen: true,
      referrerpolicy: 'strict-origin-when-cross-origin',
    });
    if (v.sns === 'instagram' || v.sns === 'threads') measureFrames.push(f);
    entry.embedBox.append(f);
  }

  function mountX(entry) {
    const v = entry.video;
    const holder = h('div', { class: 'embed__x' });
    entry.embedBox.append(holder);
    const width = Math.max(250, Math.min(550, Math.floor(entry.embedBox.clientWidth || 340)));
    loadTwitter()
      .then((twttr) => twttr.widgets.createTweet(v.id, holder, { dnt: true, lang: 'ja', align: 'center', conversation: 'none', theme: 'light', width }))
      .then((tweet) => {
        if (!tweet) { holder.remove(); showFailed(entry, 'この投稿は表示できませんでした。下のボタンから見てね'); return; }
        entry.note.hidden = true;
        entry.embedBox.classList.add('embed--ready');
      })
      .catch(() => { holder.remove(); showFailed(entry, 'Xの埋め込みを読み込めませんでした。下のボタンから見てね'); });
  }

  function fetchAuthorIfNeeded(entry) {
    const v = entry.video;
    if (v.authorLabel || (v.sns !== 'youtube' && v.sns !== 'x')) return;
    const api = v.sns === 'youtube'
      ? 'https://www.youtube.com/oembed?format=json&url='
      : 'https://publish.twitter.com/oembed?omit_script=1&url=';
    fetch(api + encodeURIComponent(v.link))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('oembed ' + r.status))))
      .then((d) => {
        if (!d || !d.author_name) return;
        const info = { name: d.author_name, url: /^https:\/\//.test(d.author_url || '') ? d.author_url : '' };
        authorCache[v.link] = info;
        writeCache(authorCache);
        v.authorLabel = info.name;
        v.authorUrl = info.url;
        entry.hay = buildHaystack(v);
        renderAuthor(entry);
      })
      .catch(() => { /* 取れなくてもOK(「投稿者は元の投稿で確認」のまま) */ });
  }

  // カードに埋め込みを入れる
  function mountEmbed(entry) {
    if (entry.mounted) return;
    try {
      if (!entry.video.canEmbed) return; // リンクだけのカード
      entry.mounted = true;
      if (entry.video.sns === 'x') mountX(entry); else mountIframe(entry);
    } catch (e) {
      console.warn('[ねこちゃ～ん] 埋め込みに失敗:', entry.video.link, e);
      showFailed(entry, 'うまく表示できませんでした。下のボタンから見てね');
    }
  }

  // カードが画面に近づいたとき
  function onVisible(entry) {
    if (!entry.authorTried) { entry.authorTried = true; fetchAuthorIfNeeded(entry); }
    mountEmbed(entry);
  }

  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver((items) => {
        items.forEach((it) => {
          if (!it.isIntersecting) return;
          observer.unobserve(it.target);
          onVisible(it.target.__entry);
        });
      }, { rootMargin: LOAD_MARGIN })
    : null;

  // ---------- 6. 一覧(検索・もっと見る) ----------
  function setupList(entries, emptyText) {
    const grid = $('grid');
    const input = $('search-input');
    const countEl = $('result-count');
    const emptyEl = $('empty');
    const moreBtn = $('more');
    let shown = PAGE_SIZE;
    const sortBtns = document.querySelectorAll('.sort-toggle__btn');

    // 並び順は2種類。ランダムは、同じタブの間は同じ並びにする。新着順は、videos.js の下の行ほど新しい
    const orders = {
      random: shuffle([...entries], getShuffleSeed()),
      newest: [...entries].sort((a, b) => b.video.fileIndex - a.video.fileIndex),
    };
    let sorted = orders.random;

    entries.forEach((e) => {
      e.el.hidden = true;
      grid.append(e.el);
      if (observer) observer.observe(e.el); else onVisible(e);
    });

    function update() {
      const words = norm(input ? input.value : '').split(/\s+/).map((w) => w.replace(/^#+/, '')).filter(Boolean);
      const matched = sorted.filter((e) => words.every((w) => e.hay.includes(w)));
      entries.forEach((e) => { e.el.hidden = true; });
      matched.forEach((e, i) => { e.el.hidden = i >= shown; });

      countEl.textContent = words.length
        ? '「' + input.value.trim() + '」で ' + matched.length + '本 見つかったよ'
        : matched.length + '本のねこちゃ～ん';
      emptyEl.hidden = matched.length > 0;
      $('empty-msg').textContent = entries.length ? '見つかりませんでした。キーワードを変えてみてね' : emptyText;
      const rest = matched.length - shown;
      moreBtn.hidden = rest <= 0;
      moreBtn.textContent = 'もっと見る(あと' + rest + '本)';
    }

    // 「ランダム」「新着順」の切り替え
    function applySort(mode, save) {
      sorted = orders[mode];
      // 画面上の順番だけを変える(部品の位置は動かさないので、読み込み済みの動画が読み込み直しにならない)
      sorted.forEach((e, i) => { e.el.style.order = String(i); });
      sortBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === mode)));
      if (save) { try { localStorage.setItem(SORT_KEY, mode); } catch (e) { /* 保存できなくても困らない */ } }
      shown = PAGE_SIZE;
      update();
    }
    sortBtns.forEach((b) => b.addEventListener('click', () => applySort(b.dataset.sort, true)));

    moreBtn.addEventListener('click', () => { shown += PAGE_SIZE; update(); });
    if (input) {
      // 日本語の変換(確定)など、端末によって「入力した」という合図の出方が違うので、いくつもの合図で絞り込む
      let last = input.value;
      const run = (force) => {
        if (!force && input.value === last) return;
        last = input.value;
        shown = PAGE_SIZE;
        update();
      };
      ['input', 'change', 'search', 'compositionend', 'keyup'].forEach((name) => input.addEventListener(name, () => run(false)));
      // キーボードの「検索」キー:必ず絞り込み、キーボードを閉じて、結果の位置まで移動する
      $('search-form').addEventListener('submit', (ev) => {
        ev.preventDefault();
        run(true);
        input.blur();
        setTimeout(() => countEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      });
    }
    // 最初の並び順:前に選んだほうを使う。初めてなら、ランダム
    let savedSort = '';
    try { savedSort = localStorage.getItem(SORT_KEY) || ''; } catch (e) { /* 読めなくても困らない */ }
    applySort(savedSort === 'newest' ? 'newest' : 'random', false);
  }

  // ---------- 7. タグのボタン ----------
  function renderTagChips(tags, currentKey, collapsible) {
    const box = $('tag-list');
    if (!box) return;
    box.textContent = '';
    const chips = tags.map((t) => h('a', {
      class: 'chip' + (t.key === currentKey ? ' chip--current' : ''),
      href: tagUrl(t.name),
    }, '#' + t.name, h('span', { class: 'chip__count' }, String(t.count))));
    chips.forEach((c) => box.append(c));

    if (collapsible && chips.length > TAGS_COLLAPSED) {
      let open = false;
      const toggle = h('button', { class: 'btn btn--ghost btn--small', type: 'button' });
      const apply = () => {
        chips.forEach((c, i) => { c.hidden = !open && i >= TAGS_COLLAPSED; });
        toggle.textContent = open ? 'たたむ' : 'ぜんぶ見る(' + chips.length + ')';
      };
      toggle.addEventListener('click', () => { open = !open; apply(); });
      box.append(toggle);
      apply();
    }
  }

  // ---------- 8. ?check=1 のときだけ出る「チェック表示」 ----------
  function renderCheck(result) {
    const box = $('check');
    if (!box || !new URLSearchParams(location.search).has('check')) return;
    box.hidden = false;
    box.append(
      h('strong', null, 'チェック結果: 表示できる動画 ' + result.videos.length + '本 / 飛ばされた行 ' + result.problems.length + '行'));
    if (result.problems.length) {
      box.append(h('ul', null, result.problems.map((p) =>
        h('li', null, h('code', null, p.text.length > 90 ? p.text.slice(0, 90) + '…' : p.text), ' → ', p.reason))));
    } else {
      box.append(h('div', null, 'すべての行を読み取れました 🎉'));
    }
  }

  // ---------- 9. ページごとの組み立て ----------
  function initHome(entries, tags) {
    if (tags.length) renderTagChips(tags, '', true); else $('tags-section').hidden = true;
    setupList(entries, 'まだ動画がありません。videos.js に URL を足してね');
  }

  function initTag(entries, tags) {
    const param = (new URLSearchParams(location.search).get('tag') || '').trim().replace(/^[#＃]+/, '');
    const found = param ? tags.find((t) => t.key === norm(param)) : null;
    const title = $('tag-title');
    const sub = $('tag-sub');

    if (!param) {
      title.textContent = 'タグいちらん';
      sub.textContent = '気になるタグを選んでね';
      ['search-form', 'toolbar', 'grid', 'empty', 'more'].forEach((id) => { const n = $(id); if (n) n.hidden = true; });
      $('tags-section').querySelector('.section-title').textContent = 'タグ';
      renderTagChips(tags, '', false);
      return;
    }

    title.textContent = '#' + (found ? found.name : param);
    document.title = '#' + (found ? found.name : param) + ' | ' + SITE_NAME;
    sub.textContent = found ? found.count + '本のねこちゃ～んが見つかりました' : 'このタグの動画は、まだありません';
    const list = found ? entries.filter((e) => e.video.tags.some((t) => t.key === found.key)) : [];
    setupList(list, 'このタグの動画は、まだありません');
    renderTagChips(tags.filter((t) => !found || t.key !== found.key), '', true);
  }

  // ---------- スタート ----------
  function main() {
    const result = loadVideos();
    const tags = buildTagIndex(result.videos);
    const entries = result.videos.map(makeEntry).filter(Boolean);
    renderCheck(result);
    if (document.body.dataset.page === 'tag') initTag(entries, tags); else initHome(entries, tags);
  }

  try {
    main();
  } catch (e) {
    console.error('[ねこちゃ～ん] 画面を作れませんでした', e);
    const grid = $('grid');
    if (grid) grid.replaceChildren(h('p', { class: 'empty' }, '読み込みに失敗しました。ページを開き直してみてね'));
  }
})();
