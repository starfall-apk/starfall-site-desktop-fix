/* =========================================================================
   content.js — общее хранилище редактируемого контента для всего сайта.

   Как это работает:
   - DEFAULT_CONTENT — контент "по умолчанию" (зашит в код, всегда доступен).
   - Реальный контент хранится в localStorage под ключом STORAGE_KEY.
   - При первом заходе localStorage пуст → используются значения по умолчанию.
   - Все страницы (включая главную) читают итоговый контент и подставляют
     тексты / иконки в разметку через data-атрибуты (data-c="path.to.field").
   - Иконки — из набора Material Icons (Round). Названия смотрите на
     fonts.google.com/icons, переключатель «Material Icons» (не Symbols!).

   Так как это localStorage — редактирование видно только в том браузере,
   где были внесены правки (это фронтенд без сервера). Если позже появится
   бэкенд — эту прослойку легко переключить на fetch к API, не трогая
   остальной код страниц.
   ========================================================================= */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'starfall_content_v1';
  var SCHEMA_VERSION = 2;

  /* ======================= КОНТЕНТ ПО УМОЛЧАНИЮ ======================= */
  var DEFAULT_CONTENT = {
    __schema: SCHEMA_VERSION,

    brand: {
      name: 'starfall',
      logo: 'logo.png',
      fullLogo: 'full-logo.png'
    },

    nav: {
      whatIDo:  { label: 'Что я делаю', icon: 'apps',            badge: '' },
      games:    { label: 'Игры',        icon: 'sports_esports',  badge: '' },
      bots:     { label: 'Боты',        icon: 'smart_toy',       badge: '' },
      ai:       { label: 'AI-проекты',  icon: 'psychology',      badge: '' },
      about:    { label: 'Обо мне',     icon: 'person',          badge: '' },
      notes:    { label: 'Заметки',     icon: 'article',         badge: 'скоро' },
      discord:  { label: 'Discord-сервер', icon: 'groups',       badge: 'скоро' }
    },

    home: {
      eyebrow: 'Работаю над Kulsh',
      title_pre: 'Создаю игры, ботов и ',
      title_accent: 'AI-проекты',
      desc: 'Меня зовут starfall. Делаю небольшие проекты, которые интересно собрать самому — игры, ботов, AI-инструменты. Без лишнего шума.'
    },

    whatIDo: {
      eyebrow: 'Чем занимаюсь',
      title: 'Что я делаю',
      desc: 'Три направления, между которыми я переключаюсь: игры для души, боты для пользы и AI-проекты ради интереса.',
      cards: [
        {
          icon: 'sports_esports',
          title: 'Игры',
          text: 'Небольшие игры, которые делаю в одиночку — от идеи до прототипа. Сейчас в разработке Hostage to Despair.'
        },
        {
          icon: 'smart_toy',
          title: 'Боты',
          text: 'Telegram- и Discord-боты. Флагман — Kulsh: разговорный бот на Google Gemini с голосом и памятью.'
        },
        {
          icon: 'psychology',
          title: 'AI-проекты',
          text: 'Эксперименты вокруг больших языковых моделей — от небольших утилит до более амбициозных идей.'
        }
      ]
    },

    games: {
      eyebrow: 'Игры',
      title: 'Игры',
      desc: 'Разрабатываю в одиночку, в свободное время. Здесь буду выкладывать всё, что дойдёт до играбельного состояния.',
      list: [
        {
          preview: 'htd.png',
          icon: 'sports_esports',
          title: 'Hostage to Despair',
          status: 'В разработке',
          text: 'Атмосферная игра, над которой я сейчас работаю. Подробности и дата выхода появятся позже — следите за обновлениями.'
        }
      ]
    },

    bots: {
      eyebrow: 'Боты',
      title: 'Боты',
      desc: 'Боты для Telegram и Discord. Подробнее о флагманском проекте — ниже.',
      list: [
        {
          icon: 'smart_toy',
          title: 'Kulsh',
          status: 'Активен',
          text: 'Разговорный бот на Google Gemini. Работает в Telegram и Discord, понимает голосовые сообщения, разбирает изображения и помнит контекст беседы.'
        }
      ]
    },

    ai: {
      eyebrow: 'AI-проекты',
      title: 'AI-проекты',
      desc: 'Эксперименты и инструменты на основе больших языковых моделей.',
      cards: [
        {
          icon: 'auto_awesome',
          title: 'Kulsh AI',
          text: 'Ядро бота Kulsh — интеграция с Google Gemini для текста, голоса и изображений.'
        }
      ]
    },

    about: {
      eyebrow: 'Обо мне',
      title: 'Привет, я starfall',
      text1: 'Делаю небольшие проекты, которые интересно собрать самому — игры, ботов, AI-инструменты. Без лишнего шума и без больших команд.',
      text2: 'Сейчас основное внимание — бот Kulsh и игра Hostage to Despair. Пишите, если хотите обсудить проект или просто сказать привет.',
      stack: 'Python · Google Gemini API · pyTelegramBotAPI · discord.py'
    },

    notes: {
      eyebrow: 'Заметки',
      title: 'Заметки',
      desc: 'Короткие записи о процессе разработки, мыслях и планах. Раздел ещё наполняется.',
      empty: 'Пока здесь пусто — первые заметки скоро появятся.'
    },

    kulsh: {
      title: 'Kulsh — бот, который разговаривает',
      desc: 'Работает в Telegram и Discord. Понимает голосовые сообщения, разбирает изображения и помнит контекст беседы. Внутри — Google Gemini.',
      badge: 'Основной проект',
      cardTitle: 'Возможности',
      cardText: 'Отвечает текстом и голосом, разбирает фотографии и помнит, о чём шла речь. А ещё оценивает внешность по PSL.',
      features: [
        { icon: 'forum', text: 'Работает в Telegram и Discord' },
        { icon: 'record_voice_over', text: 'Понимает голосовые, отвечает голосом' },
        { icon: 'visibility', text: 'Разбирает изображения' },
        { icon: 'psychology', text: 'Помнит разговор' },
        { icon: 'face_retouching_natural', text: 'Оценка внешности по PSL' },
        { icon: 'favorite', text: 'Донаты и таблица лидеров' }
      ]
    },

    links: {
      title: 'Где меня найти',
      desc: 'Напишите удобным способом — я отвечу.',
      /* Порядок важен для главной: 5 карточек в разметке index.html.
         Пятая (Discord) также задаёт ссылку пункта «Discord-сервер» в боковом меню. */
      items: [
        { icon: 'send',               title: 'Telegram-канал', sub: '@starfallapk',  href: 'https://t.me/starfallapk' },
        { icon: 'code',               title: 'GitHub',         sub: 'starfall-apk',  href: 'https://github.com/starfall-apk' },
        { icon: 'chat',               title: 'Личный чат',     sub: '@lolfall',      href: 'https://t.me/lolfall' },
        { icon: 'volunteer_activism', title: 'DonationAlerts', sub: 'Поддержать',    href: 'https://www.donationalerts.com/r/downfalls' },
        { icon: 'groups',             title: 'Discord-сервер', sub: 'Сообщество',    href: 'https://discord.gg/YOUR_INVITE_CODE' }
      ]
    },

    footer: {
      note: '© 2026 starfall-apk'
    }
  };

  /* ============================== HELPERS ============================== */

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(base, override) {
    if (Array.isArray(base)) {
      return (override !== undefined) ? override : base;
    }
    if (typeof base === 'object' && base !== null) {
      var out = {};
      var key;
      for (key in base) {
        if (Object.prototype.hasOwnProperty.call(base, key)) {
          out[key] = deepMerge(base[key], override ? override[key] : undefined);
        }
      }
      if (override) {
        for (key in override) {
          if (Object.prototype.hasOwnProperty.call(override, key) && !(key in out)) {
            out[key] = override[key];
          }
        }
      }
      return out;
    }
    return (override !== undefined) ? override : base;
  }

  /* ===================== ИКОНКИ: ЗАМЕНА НЕСУЩЕСТВУЮЩИХ ===================== */
  /* Сайт использует Material Icons (Round). В этом наборе нет части иконок из
     Material Symbols — если такое имя попадёт в контент, вместо иконки на
     странице отобразился бы текст. Известные случаи подменяются на ближайшие. */
  var ICON_ALIASES = {
    neurology: 'psychology',
    stadia_controller: 'sports_esports'
  };

  function resolveIcon(name) {
    return Object.prototype.hasOwnProperty.call(ICON_ALIASES, name) ? ICON_ALIASES[name] : name;
  }

  /* ============================ МИГРАЦИЯ ХРАНИЛИЩА ============================ */
  /* v2: главная снова читает контент из админки, блок «Связаться» расширен до
     5 карточек (добавлены Telegram-канал, GitHub, Discord). Старый сохранённый
     блок links (2 карточки) не подходит к новой разметке — сбрасываем его к
     значениям по умолчанию. Остальные правки пользователя сохраняются. */
  function migrate(stored) {
    if (!stored || typeof stored !== 'object') return stored;
    var v = stored.__schema || 1;
    if (v < 2) {
      delete stored.links;
      stored.__schema = 2;
    }
    return stored;
  }

  /* Приводит произвольный объект (импорт, JSON-вкладка) к актуальной схеме */
  function normalize(obj) {
    return deepMerge(DEFAULT_CONTENT, migrate(obj));
  }

  function load() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }
    if (!raw) return deepClone(DEFAULT_CONTENT);
    try {
      var parsed = JSON.parse(raw);
      return normalize(parsed);
    } catch (e) {
      return deepClone(DEFAULT_CONTENT);
    }
  }

  function save(content) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      return true;
    } catch (e) {
      return false;
    }
  }

  function reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  function getByPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function setByPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i];
      if (!(p in cur)) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  /* ===================== ПРИМЕНЕНИЕ К РАЗМЕТКЕ СТРАНИЦЫ ===================== */
  /* Проходит по всем [data-c] и подставляет текст,
     по всем [data-c-icon] подставляет имя Material Icon,
     по всем [data-c-src] подставляет путь к картинке,
     по всем [data-c-href] подставляет ссылку. */
  function applyToDOM(content) {
    document.querySelectorAll('[data-c]').forEach(function (el) {
      var val = getByPath(content, el.getAttribute('data-c'));
      if (val !== undefined && val !== null) el.textContent = val;
    });
    document.querySelectorAll('[data-c-icon]').forEach(function (el) {
      var val = getByPath(content, el.getAttribute('data-c-icon'));
      if (val !== undefined && val !== null && val !== '') el.textContent = resolveIcon(val);
    });
    document.querySelectorAll('[data-c-src]').forEach(function (el) {
      var val = getByPath(content, el.getAttribute('data-c-src'));
      if (val) el.setAttribute('src', val);
    });
    document.querySelectorAll('[data-c-href]').forEach(function (el) {
      var val = getByPath(content, el.getAttribute('data-c-href'));
      if (val) el.setAttribute('href', val);
    });
    document.querySelectorAll('[data-c-badge]').forEach(function (el) {
      var val = getByPath(content, el.getAttribute('data-c-badge'));
      if (val) {
        el.textContent = val;
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  global.StarfallContent = {
    DEFAULT_CONTENT: DEFAULT_CONTENT,
    load: load,
    save: save,
    reset: reset,
    normalize: normalize,
    resolveIcon: resolveIcon,
    getByPath: getByPath,
    setByPath: setByPath,
    applyToDOM: applyToDOM,
    deepClone: deepClone
  };
})(window);
