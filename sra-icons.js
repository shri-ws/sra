/* sra-icons.js — premium line icons in place of colour emoji, site-wide.
   Every visible emoji (static markup or added later by reports/chat) becomes a
   thin single-tone SVG in the theme's gold; astro/typographic signs stay text.
   Loaded by sra-ui.js, so every page that has sra-ui.js gets it. */
(function () {
  'use strict';
  if (window.__sraIcons) return;
  window.__sraIcons = true;

  // 24×24 line drawings (stroke = currentColor)
  const P = {
    scroll: '<path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/><path d="M15 8h-5M15 12h-5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01"/>',
    book: '<path d="M2 4.5h6a4 4 0 0 1 4 4V21a3 3 0 0 0-3-3H2z"/><path d="M22 4.5h-6a4 4 0 0 0-4 4V21a3 3 0 0 1 3-3h7z"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2"/>',
    unlock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 7.8-1.2M12 15v2"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
    star: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    crown: '<path d="M3 7l4.5 5L12 4l4.5 8L21 7l-1.8 10H4.8z"/><path d="M5 21h14"/>',
    ring: '<circle cx="12" cy="15" r="6.5"/><path d="M9.5 4.5 12 2l2.5 2.5L12 8z"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    pin: '<path d="M12 21.5s-7-6.2-7-11.7a7 7 0 0 1 14 0c0 5.5-7 11.7-7 11.7z"/><circle cx="12" cy="9.8" r="2.5"/>',
    alert: '<path d="M10.3 3.9 2.4 17.5a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5M12 17h.01"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.9-2.8-6.3-4.3-9.2-.6 2.2-1.9 3.5-3.2 4C11.8 7 10.5 4.2 8.5 2c.2 3.6-3.5 6.4-3.5 11.2C5 18.6 8 22 12 22z"/>',
    hourglass: '<path d="M6 2h12M6 22h12"/><path d="M7 2v2.5c0 2.2 1.6 4 3.5 5.5L12 12l1.5-2C15.4 8.5 17 6.7 17 4.5V2M7 22v-2.5c0-2.2 1.6-4 3.5-5.5L12 12l1.5 2c1.9 1.5 3.5 3.3 3.5 5.5V22"/>',
    bulb: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    check: '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.3 2.7 2.7 5.5-5.5"/>',
    cross: '<circle cx="12" cy="12" r="9.5"/><path d="m9 9 6 6M15 9l-6 6"/>',
    planet: '<circle cx="12" cy="12" r="5.2"/><ellipse cx="12" cy="12" rx="10.5" ry="3.4" transform="rotate(-22 12 12)"/>',
    orb: '<circle cx="12" cy="10" r="7"/><path d="M7 21h10M8.6 16.2 7 21M15.4 16.2 17 21M9 8.5A3.5 3.5 0 0 1 12 6"/>',
    diya: '<path d="M3 13h18c-.8 4.2-4.6 7-9 7s-8.2-2.8-9-7z"/><path d="M12 3c1.7 2 2.5 3.6 2.5 5a2.5 2.5 0 0 1-5 0c0-1.4.8-3 2.5-5z"/>',
    coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v4c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 14v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-6c0-1.6-2.4-2.9-5.5-3"/>',
    landmark: '<path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M2 10h20L12 3z"/>',
    temple: '<path d="M12 1.5v2.5M8 21v-9l4-7.5 4 7.5v9M4 21h16M10 21v-3.5a2 2 0 0 1 4 0V21M5.5 21v-6h2.5M18.5 21v-6H16"/>',
    chart: '<path d="M3 21h18M7 17v-6M12 17V6M17 17v-4"/>',
    flag: '<path d="M5 22V3M5 4h12l-2.5 4L17 12H5"/>',
    shield: '<path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5 16 16"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    phone: '<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>',
    globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.6 2.8 4 6 4 9.5s-1.4 6.7-4 9.5c-2.6-2.8-4-6-4-9.5s1.4-6.7 4-9.5z"/>',
    target: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.5"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4.5V8M9 13v1.5M15 13v1.5M2 13v3M22 13v3"/><circle cx="12" cy="3.5" r="1"/>',
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chat: '<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.4-5.4A8.5 8.5 0 1 1 21 12z"/>',
    clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3.5 2"/>',
    cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M22 9v6"/>',
    case: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>',
    lotus: '<path d="M12 20c-4.5 0-8-2.2-9.5-5.5 2.8-.6 5.6.2 7.5 2M12 20c4.5 0 8-2.2 9.5-5.5-2.8-.6-5.6.2-7.5 2"/><path d="M12 20c-2.6-2-3.8-4.6-3.8-7.5S9.4 6.6 12 4.5c2.6 2.1 3.8 5 3.8 8S14.6 18 12 20z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2M17 6l3 3M15 8l2 2"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
    car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2M3 12h18M9.5 17h5"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    thread: '<path d="M4 3.5c6.5.3 10.6 5.6 16 16.5M3.2 7c5.6.6 9.2 5.4 12.8 13M7.5 3.2c5 1 8.6 5.6 13.3 13.3"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    gem: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M12 21 8.5 9 12 3l3.5 6z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L3 9M3 4v5h5M4 13a8 8 0 0 0 14.5 4.5L21 15M21 20v-5h-5"/>',
    launch: '<path d="M5 19 19 5M9 5h10v10"/>',
    file: '<path d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5z"/><path d="M14 2.5v5h5M9 13h6M9 17h6"/>',
    tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    help: '<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4M12 17.5h.01"/>',
    right: '<path d="M4 12h16M14 6l6 6-6 6"/>',
    up: '<path d="M12 20V4M6 10l6-6 6 6"/>',
    link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
    trishul: '<path d="M12 22V4M10 2.5 12 1l2 1.5L12 5z"/><path d="M5 3.5c0 5 2.5 7.5 7 7.5s7-2.5 7-7.5M3.8 5.5 5 3.5l1.2 2M17.8 5.5 19 3.5l1.2 2M9 16h6"/>',
    printer: '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    compass: '<circle cx="12" cy="12" r="9.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    snake: '<path d="M3 18c2.5 0 3.5-1.5 5-3s3-3 5-3 3.5 1.5 5 1.5a3 3 0 0 0 0-6c-1.3 0-2.2.6-3 1.5"/><path d="M18 7.5h.01"/>',
    mala: '<circle cx="12" cy="10" r="7" stroke-width="2.6" stroke-dasharray="0.01 3.1"/><path d="M12 17v2.5M10 22l2-2.5 2 2.5"/>',
    bow: '<path d="M4 20 20 4M14 4h6v6"/><path d="M5 8.5A12 12 0 0 0 15.5 19"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m3 6.5 9 6.5 9-6.5"/>',
    sound: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6M21 9l-5 6"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
    award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
    pen: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
    halfmoon: '<circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19a9.5 9.5 0 0 0 0-19z" fill="currentColor"/>',
    camera: '<path d="M3 8a2 2 0 0 1 2-2h2.5L9 4h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.5"/>',
    ruler: '<path d="M3 21 21 3v18z"/><path d="M8 21v-2M12 21v-3M16 21v-2M16 14h2"/>',
    waves: '<path d="M2 8c2 0 2-1.5 4-1.5S8 8 10 8s2-1.5 4-1.5S16 8 18 8s2-1.5 4-1.5M2 14c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/>',
    bricks: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 9.7h18M3 14.3h18M9 5v4.7M15 5v4.7M6 9.7v4.6M12 9.7v4.6M18 9.7v4.6M9 14.3V19M15 14.3V19"/>',
    wheel: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v7M12 14v7M3 12h7M14 12h7M5.6 5.6l5 5M13.4 13.4l5 5M5.6 18.4l5-5M13.4 10.6l5-5"/>',
    leaf: '<path d="M5 21c0-9 5-15 16-17-1 10-6 16-14 16"/><path d="m5 21 8-8"/>',
    save: '<path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 1-2z"/><path d="M8 3v5h7V3M7 21v-7h10v7"/>',
    pause: '<path d="M9 5v14M15 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5"/>',
    flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10"/>',
    feather: '<path d="M20 4C14 4 8 8 6 16l-2 4"/><path d="M20 4c0 7-4 12-12 12M10 12h5"/>',
    heart: '<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20z"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10.5 3 8 4s1 4 4 4zM12 8s1.5-5 4-4-1 4-4 4z"/>',
    battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 11v2M6 10v4M9.5 10v4"/>',
    mountain: '<path d="M3 20 9.5 8l4 6.5L16 11l5 9z"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'
  };
  const DOT = { '🔴': '#B3261E', '🟢': '#2E7D32', '🟡': '#C99A2E', '🔵': '#2B5A9E', '🟠': '#D9822B', '🟣': '#6B3FA0', '⚪': '#E8E2D4', '⚫': '#2A2420' };

  const MAP = {};
  const add = (name, chars) => [...chars].forEach(c => { MAP[c] = name; });
  add('scroll', '📜'); add('gear', '⚙🛠🔧'); add('calendar', '📅🗓📆'); add('book', '📖📚📘📕📗📙📓');
  add('lock', '🔒🔐'); add('unlock', '🔓'); add('sparkle', '✨🎉🎊🌌🔭🛰💫🌠'); add('star', '🌟⭐');
  add('crown', '👑'); add('ring', '💍'); add('zap', '⚡'); add('pin', '📍📌'); add('alert', '⚠🚨⛔🚫');
  add('flame', '🔥'); add('hourglass', '⏳⌛'); add('bulb', '💡'); add('check', '✅✔☑'); add('cross', '❌❎');
  add('planet', '🪐'); add('orb', '🔮'); add('diya', '🪔'); add('coins', '🪙💰💵💸');
  add('landmark', '🏛🏦'); add('temple', '🛕'); add('chart', '📊📈📉📶'); add('flag', '🚩🏁'); add('shield', '🛡✋');
  add('search', '🔍🔎'); add('user', '👤👶👦👧👨👩👰🤵🧑'); add('users', '👥💑👫🤝👪');
  add('phone', '📱📲📞☎'); add('globe', '🌐🌍🌎🌏'); add('target', '🎯'); add('bot', '🤖');
  add('home', '🏡🏠🏘'); add('chat', '💬🗨'); add('clock', '⏱⏰🕒🕐⏲'); add('cap', '🎓'); add('case', '💼');
  add('download', '📥⬇'); add('moon', '🌙🌛🌜'); add('lotus', '🙏🪷🌸🌺🌹🌼🧘💐'); add('plus', '➕'); add('minus', '➖');
  add('key', '🔑🗝'); add('scissors', '✂'); add('car', '🚗🚘🚙'); add('folder', '📂📁🗂'); add('thread', '🧵🪢');
  add('card', '💳👛'); add('scale', '⚖'); add('gem', '💎'); add('refresh', '🔄🔁🌀'); add('launch', '🚀✈↗');
  add('file', '📋📝📑📄📃🧾'); add('tag', '🏷'); add('help', '❓❔'); add('right', '👉➡'); add('up', '👆⬆');
  add('link', '🔗'); add('trishul', '🔱'); add('printer', '🖨'); add('sun', '☀🌅🌞🌄'); add('compass', '🧭');
  add('map', '🗺'); add('snake', '🐍'); add('mala', '📿'); add('bow', '🏹'); add('eye', '👁👀'); add('mail', '📧✉📩📨');
  add('sound', '🔊🔉'); add('mute', '🔇'); add('mic', '🎙🎤'); add('award', '🏆🥇🥈🥉🏅🎖'); add('pen', '✏✍🖊🖋');
  add('trash', '🗑'); add('halfmoon', '🌓🌗'); add('camera', '📸📷🎥📹'); add('ruler', '📐📏🧮'); add('waves', '🌊');
  add('bricks', '🧱🏗'); add('wheel', '🎡☸'); add('leaf', '🌿🌱🍃🌾'); add('save', '💾'); add('pause', '⏸'); add('stop', '⏹');
  add('flask', '🧪⚗'); add('feather', '🕊🪶'); add('heart', '❤🩺🤗💖💗'); add('gift', '🎁🎂'); add('battery', '🔋');
  add('mountain', '⛰🏔'); add('bell', '🔔');

  // Astro and typographic signs that are text, not emoji: keep them, forced to text style
  const KEEP = new Set([...'♈♉♊♋♌♍♎♏♐♑♒♓♂♀⚧☉☽☾☿♃♄♅♆♇☊☋⚶★☆✓✗✕✖✦✧➔❮❯☰⎋⌘⌂☐❖✱✳❇']);

  const RE = /[\u{1F1E6}-\u{1F1FF}]{2}|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B05}-\u{2B55}][︎️]?[\u{1F3FB}-\u{1F3FF}]?(?:‍[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}][️]?)*/gu;
  const QUICK = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B05}-\u{2B55}]/u;
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|CODE|PRE|SVG|CANVAS|IFRAME|OPTION|SELECT|TITLE)$/;
  const NS = 'http://www.w3.org/2000/svg';

  function icon(name) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'sra-ic sra-ic-' + name);
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = P[name];
    return s;
  }
  function dot(color) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('class', 'sra-ic sra-ic-dot');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<circle cx="12" cy="12" r="6" fill="' + color + '" stroke="none"/>';
    return s;
  }

  // What one matched emoji becomes: a node, a string, or '' (removed)
  function convert(m) {
    const base = String.fromCodePoint(m.codePointAt(0));
    if (/^[\u{1F1E6}-\u{1F1FF}]/u.test(base)) return '';              // flags
    if (KEEP.has(base)) return base + '︎';
    if (base === '🕉') { const o = document.createElement('span'); o.className = 'sra-ic-om'; o.textContent = 'ॐ'; return o; }
    if (DOT[base]) return dot(DOT[base]);
    if (MAP[base]) return icon(MAP[base]);
    const cp = base.codePointAt(0);
    if (cp < 0x1F000) return base + '︎';                             // other text symbols
    return icon('sparkle');
  }

  function skipEl(el) {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      if (SKIP.test(e.nodeName.toUpperCase()) || e.isContentEditable || (e.classList && e.classList.contains('sra-raw-emoji'))) return true;
    }
    return false;
  }

  function stripText(s) { return s.replace(RE, m => { const r = convert(m); return typeof r === 'string' ? r : ''; }).replace(/^\s+/, ''); }

  function fixTextNode(t) {
    const s = t.nodeValue;
    if (!s || !QUICK.test(s)) return;
    const p = t.parentElement;
    if (!p) return;
    if (p.nodeName === 'OPTION' || p.nodeName === 'TITLE') { t.nodeValue = stripText(s); return; }
    if (skipEl(p)) return;
    RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m, changed = false;
    while ((m = RE.exec(s))) {
      const r = convert(m[0]);
      if (typeof r === 'string' && r === m[0]) continue;
      frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      if (r) frag.appendChild(typeof r === 'string' ? document.createTextNode(r) : r);
      last = m.index + m[0].length;
      changed = true;
    }
    if (!changed) return;
    frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, t);
  }

  function fixAttrs(root) {
    if (!root.querySelectorAll) return;
    const list = root.matches && root.matches('[placeholder],[title]') ? [root] : [];
    root.querySelectorAll('[placeholder],[title]').forEach(e => list.push(e));
    list.forEach(e => ['placeholder', 'title'].forEach(a => {
      const v = e.getAttribute(a);
      if (v && QUICK.test(v)) e.setAttribute(a, stripText(v));
    }));
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) { fixTextNode(root); return; }
    if (root.nodeType !== 1 || (root.nodeName !== 'BODY' && skipEl(root) && root.nodeName !== 'SELECT')) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => QUICK.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(fixTextNode);
    fixAttrs(root);
  }

  let pending = new Set(), queued = false;
  function flush() {
    queued = false;
    const roots = [...pending]; pending = new Set();
    roots.forEach(n => { if (n.isConnected) scan(n); });
    if (QUICK.test(document.title)) document.title = stripText(document.title);
  }
  function queue(n) {
    pending.add(n);
    if (!queued) { queued = true; requestAnimationFrame(flush); }
  }

  function start() {
    scan(document.body);
    if (QUICK.test(document.title)) document.title = stripText(document.title);
    new MutationObserver(muts => {
      for (const m of muts) m.addedNodes.forEach(queue);
    }).observe(document.body, { childList: true, subtree: true });
  }
  window.sraIconize = scan;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
