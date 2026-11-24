// @ts-check
/* Languages for the tools on samplesize1.com: one way to pick a language, look up text in it and switch it,
 * shared by every tool that has more than English. (Everything stays in the visitor's browser.)
 *
 * In a tool page:
 *
 *   <head>…<script src="/js/language.js"></script>…</head>          (in the head: it styles the picker before it shows)
 *   …
 *   <p id="loadMsg" data-i18n-boot="loading">Loading…</p>
 *   …
 *   <script>
 *   SiteLanguage.start({
 *     tool: 'bone-atlas',                 // the tool's folder name: the choice is saved under it
 *     langs: ['en', 'fr', 'la'],          // the languages the page offers, English first (codes from LANGUAGES below)
 *     namesOnly: ['la'],                  // ones with names in that language but the interface in English
 *     boot: { en: { loading: '…' }, fr: { loading: '…' } },   // start-up text, shown before the tool's code runs
 *     legacy: ['the206.lang'],            // (optional) where an older version saved the choice
 *   });
 *   </script>
 *
 * Then the tool's code, once:
 *
 *   const lang = await SiteLanguage.open({ layers: [
 *     { text: EN, files: new URL('lang/', import.meta.url) },            // English text, and where lang/<code>.json are
 *     { text: SHARED_EN, files: …, has: ['fr', 'es'] },                  // more general text after it (an engine's)
 *   ], prefix: 'capitals' });                                            // (optional) 'capitals.key' wins over 'key'
 *   lang.t('key', { name: … })   lang.list('key')   lang.join(['A', 'B'])   lang.file(0).names   lang.onChange(() => redraw())
 *
 * How a language is picked: a ?lang= link, then the newest language picked anywhere on the site (here, in another
 * tool or on the site's own pages) that this page has, then the browser's languages, then English. Picking one in the
 * menu saves it for the whole site, newest first ("ss1.site.langs"; the site's pages read the same list, in
 * src/layouts/Layout.astro), and puts it in the page's address (?lang=de), so the address shared opens in it.
 *
 * Text: each layer's English is a table of key -> text. A text can have {name}s to fill in, and a text that depends on
 * a number is { one: '…', other: '…' } (or the forms the language has: zero, two, few, many), picked by n with
 * Intl.PluralRules; "=1" (or "=0"…) is for exactly that number, where the words drop it ("next move", not "in 1 move":
 * Russian's "one" form also covers 21). A list (left / right…) is an array. lang/<code>.json is { "ui": { key: text }, …names }: the
 * interface in that language (every English key of the layer), plus whatever names the tool teaches. A names-only
 * language has no "ui"; its file may have a "note" (in English) to show under the menu instead of the usual one.
 * A key belongs to the first layer whose English has it, and comes from that layer's file, else its English.
 *
 * The markup: data-i18n="key" sets an element's text, data-i18n-title / -aria / -ph its tooltip, aria-label and
 * placeholder, data-i18n-html="key" its HTML, with the links inside it kept: <a data-i18n-link="ne"> fills {ne}.
 * data-i18n-boot="key" is start-up text. The picker is #langSel (with #langNote under it, in #langBox if the
 * section should hide when there is only English): this file fills and runs it, and styles it with the tool's colours
 * (--fg, --muted, --bg, --bg-lift, --line-strong and --scan, the accent).
 *
 * Credits: give the paragraph with a tool's credits and licences class="credit" (one per page, or one per panel) and
 * this file folds it into a small "Credits" line that opens on a click, in every tool the same way. */
(function (w) {
	'use strict';

	/* ---------------- the languages ---------------- */
	// code: [its own name, its BCP 47 tag, what else to know]. Codes are what ?lang= and the files use.
	// rtl: written right to left. nouns: nouns keep their capital letter mid-sentence.
	var LANGUAGES = {
		en: ['English', 'en'],
		ar: ['العربية', 'ar', { rtl: true }],
		bn: ['বাংলা', 'bn'],
		de: ['Deutsch', 'de', { nouns: true }],
		el: ['Ελληνικά', 'el'],
		es: ['Español', 'es'],
		fa: ['فارسی', 'fa', { rtl: true }],
		fr: ['Français', 'fr'],
		he: ['עברית', 'he', { rtl: true }],
		hi: ['हिन्दी', 'hi'],
		hu: ['Magyar', 'hu'],
		id: ['Bahasa Indonesia', 'id'],
		it: ['Italiano', 'it'],
		ja: ['日本語', 'ja'],
		ko: ['한국어', 'ko'],
		la: ['Latina', 'la'],
		nl: ['Nederlands', 'nl'],
		pl: ['Polski', 'pl'],
		pt: ['Português', 'pt-BR'],
		ru: ['Русский', 'ru'],
		sv: ['Svenska', 'sv'],
		tr: ['Türkçe', 'tr'],
		uk: ['Українська', 'uk'],
		ur: ['اردو', 'ur', { rtl: true }],
		vi: ['Tiếng Việt', 'vi'],
		zh: ['简体中文', 'zh-Hans'],
		zht: ['繁體中文', 'zh-Hant'],
	};
	var info = function (code) {
		var l = LANGUAGES[code] || LANGUAGES.en;
		return { code: code, name: l[0], tag: l[1], rtl: !!(l[2] && l[2].rtl), nouns: !!(l[2] && l[2].nouns) };
	};

	// The few words of the picker itself (and of the folded credits line, below), the same in every tool. names_note
	// is shown in English, because a names-only language has the rest of the page in English.
	var OWN = {
		en: { lang_title: 'Language', lang_note: '', lang_load_fail: 'That language didn’t load. Check your connection and try again.', names_note: 'Names are in {lang}. The rest of the page stays in English.', credits: 'Credits' },
		ar: { lang_title: 'اللغة', lang_load_fail: 'لم تُحمَّل هذه اللغة. تحقّق من اتصالك وحاول مرة أخرى.', credits: 'المصادر' },
		bn: { lang_title: 'ভাষা', lang_load_fail: 'ভাষাটি লোড হয়নি। আপনার সংযোগ দেখে আবার চেষ্টা করুন।', credits: 'কৃতজ্ঞতা' },
		de: { lang_title: 'Sprache', lang_load_fail: 'Diese Sprache wurde nicht geladen. Prüfe deine Verbindung und versuche es noch einmal.', credits: 'Quellen' },
		es: { lang_title: 'Idioma', lang_load_fail: 'Ese idioma no se cargó. Revisa tu conexión e inténtalo de nuevo.', credits: 'Créditos' },
		fa: { lang_title: 'زبان', lang_load_fail: 'این زبان بارگذاری نشد. اتصال خود را بررسی کنید و دوباره امتحان کنید.', credits: 'منابع' },
		el: { lang_title: 'Γλώσσα', lang_load_fail: 'Αυτή η γλώσσα δεν φορτώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.', credits: 'Πηγές' },
		fr: { lang_title: 'Langue', lang_load_fail: 'Cette langue ne s’est pas chargée. Vérifiez votre connexion et réessayez.', credits: 'Crédits' },
		he: { lang_title: 'שפה', lang_load_fail: 'השפה לא נטענה. בדקו את החיבור ונסו שוב.', credits: 'קרדיטים' },
		hi: { lang_title: 'भाषा', lang_load_fail: 'यह भाषा लोड नहीं हुई। अपना कनेक्शन जाँचें और फिर से कोशिश करें।', credits: 'श्रेय' },
		hu: { lang_title: 'Nyelv', lang_load_fail: 'Ez a nyelv nem töltődött be. Ellenőrizd a kapcsolatot, és próbáld újra.', credits: 'Források' },
		id: { lang_title: 'Bahasa', lang_load_fail: 'Bahasa ini gagal dimuat. Periksa koneksimu lalu coba lagi.', credits: 'Kredit' },
		it: { lang_title: 'Lingua', lang_load_fail: 'Questa lingua non si è caricata. Controlla la connessione e riprova.', credits: 'Crediti' },
		ja: { lang_title: '言語', lang_load_fail: 'この言語を読み込めませんでした。接続を確認して、もう一度お試しください。', credits: 'クレジット' },
		ko: { lang_title: '언어', lang_load_fail: '이 언어를 불러오지 못했어요. 연결을 확인하고 다시 시도하세요.', credits: '출처' },
		nl: { lang_title: 'Taal', lang_load_fail: 'Deze taal is niet geladen. Controleer je verbinding en probeer het opnieuw.', credits: 'Bronnen' },
		pl: { lang_title: 'Język', lang_load_fail: 'Ten język się nie wczytał. Sprawdź połączenie i spróbuj ponownie.', credits: 'Źródła' },
		pt: { lang_title: 'Idioma', lang_load_fail: 'Esse idioma não carregou. Verifique sua conexão e tente de novo.', credits: 'Créditos' },
		ru: { lang_title: 'Язык', lang_load_fail: 'Этот язык не загрузился. Проверьте подключение и попробуйте ещё раз.', credits: 'Источники' },
		sv: { lang_title: 'Språk', lang_load_fail: 'Språket laddades inte. Kontrollera anslutningen och försök igen.', credits: 'Källor' },
		tr: { lang_title: 'Dil', lang_load_fail: 'Bu dil yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.', credits: 'Kaynaklar' },
		uk: { lang_title: 'Мова', lang_load_fail: 'Цю мову не вдалося завантажити. Перевірте з’єднання й спробуйте ще раз.', credits: 'Джерела' },
		ur: { lang_title: 'زبان', lang_load_fail: 'یہ زبان لوڈ نہیں ہوئی۔ اپنا کنکشن چیک کریں اور دوبارہ کوشش کریں۔', credits: 'حوالہ جات' },
		vi: { lang_title: 'Ngôn ngữ', lang_load_fail: 'Không tải được ngôn ngữ này. Hãy kiểm tra kết nối và thử lại.', credits: 'Ghi công' },
		zh: { lang_title: '语言', lang_load_fail: '该语言未能加载。请检查网络连接后重试。', credits: '致谢' },
		zht: { lang_title: '語言', lang_load_fail: '此語言無法載入。請檢查網路連線後再試一次。', credits: '致謝' },
	};

	// The picker's look: the tool's own colours (each tool defines these variables)
	var CSS =
		'.lang-pick{position:relative;display:block}' +
		'.lang-pick svg{position:absolute;left:10px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--scan);pointer-events:none}' +
		'.lang-pick::after{content:"";position:absolute;right:12px;top:50%;width:6px;height:6px;margin-top:-5px;border:solid var(--muted);border-width:0 1.5px 1.5px 0;transform:rotate(45deg);pointer-events:none}' +
		'#langSel{width:100%;appearance:none;-webkit-appearance:none;font:inherit;font-size:13px;font-weight:600;color:var(--fg);background:var(--bg);border:1px solid var(--line-strong);border-radius:7px;padding:8px 30px 8px 33px;cursor:pointer}' +
		'#langSel:hover,#langSel:focus{border-color:var(--scan);outline:none}' +
		'#langSel option{background:var(--bg-lift);color:var(--fg)}' +
		'details.site-credits{margin:0}' +
		'details.site-credits>summary{display:inline-flex;align-items:center;gap:.45em;cursor:pointer;list-style:none;font-size:11px;color:var(--muted);user-select:none}' +
		'details.site-credits>summary::-webkit-details-marker{display:none}' +
		'details.site-credits>summary::before{content:"";width:.4em;height:.4em;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(-45deg);transition:transform .15s}' +
		'details.site-credits[open]>summary::before{transform:rotate(45deg)}' +
		'details.site-credits>summary:hover,details.site-credits>summary:focus-visible{color:var(--fg);outline:none}' +
		'details.site-credits[open]>.credit{margin-top:6px}' +
		// Arabic script joins its letters, which letter spacing breaks apart (every tool's small labels are spaced; Hebrew
		// isn't spaced out either), and
		// no monospace font draws it (or Hebrew) well: their letters come from the system's sans-serif, while Latin
		// letters and digits keep the tool's monospace font
		':is(html[lang=ar],html[lang=fa],html[lang=ur],html[lang=he],html[lang=bn],html[lang=hi]) *{letter-spacing:0!important}' +
		':is(html[lang=ar],html[lang=fa],html[lang=ur],html[lang=he]){--f-mono:"IBM Plex Mono",system-ui,sans-serif}';
	function addStyle() {
		var d = w.document;
		if (!d || !d.head || d.getElementById('lang-style')) return;
		var s = d.createElement('style');
		s.id = 'lang-style';
		s.textContent = CSS;
		d.head.appendChild(s);
	}

	/* ---------------- the credits, folded ---------------- */
	// Every tool's credits (the element with class "credit") start folded into a small "Credits" line that opens on
	// a click: one click away, not filling the page. One a tool draws later (a panel it redraws) is folded too, and
	// opens again if the visitor had it open. The label follows the language picked.
	var creditsOpen = false;
	function creditsWord(code) {
		var own = translated(code) && OWN[code];
		return (own && own.credits) || OWN.en.credits;
	}
	function foldCredits(root) {
		var d = w.document, els = root.getElementsByClassName ? root.getElementsByClassName('credit') : [];
		var list = Array.prototype.slice.call(els);
		if (root.classList && root.classList.contains('credit')) list.push(root);
		list.forEach(function (el) {
			if (!el.parentNode || (el.parentNode.matches && el.parentNode.matches('details.site-credits'))) return;
			var box = d.createElement('details'), sum = d.createElement('summary');
			box.className = 'site-credits'; box.open = creditsOpen;
			sum.textContent = creditsWord(api.code);
			el.parentNode.insertBefore(box, el);
			box.appendChild(sum); box.appendChild(el);
			box.addEventListener('toggle', function () { creditsOpen = box.open; });
		});
	}
	function relabelCredits() {
		var d = w.document, sums = d && d.querySelectorAll ? d.querySelectorAll('details.site-credits>summary') : [];
		for (var i = 0; i < sums.length; i++) sums[i].textContent = creditsWord(api.code);
	}
	function watchCredits() {
		var d = w.document;
		if (!d || !d.body || !d.body.getElementsByClassName) return;
		foldCredits(d.body);
		if (!w.MutationObserver) return;
		new w.MutationObserver(function (changes) {
			for (var i = 0; i < changes.length; i++) {
				for (var j = 0; j < changes[i].addedNodes.length; j++) {
					var n = changes[i].addedNodes[j];
					if (n.nodeType === 1 && (n.classList.contains('credit') || n.getElementsByClassName('credit').length)) foldCredits(n);
				}
			}
		}).observe(d.body, { childList: true, subtree: true });
	}
	function startCredits() {
		var d = w.document;
		if (!d || !d.addEventListener) return;
		if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', watchCredits);
		else watchCredits();
	}

	/* ---------------- picking one ---------------- */
	// A code from a ?lang= value, a saved value or a browser language ('fr-CA', 'zh-TW', 'pt_BR'), if it is offered
	function match(value, offered) {
		var v = String(value == null ? '' : value).trim().toLowerCase().replace(/_/g, '-');
		if (!v) return null;
		if (offered.indexOf(v) >= 0) return v;
		for (var i = 0; i < offered.length; i++) if (info(offered[i]).tag.toLowerCase() === v) return offered[i];
		var parts = v.split('-'), base = parts[0];
		if (base === 'zh') {
			var traditional = parts.slice(1).some(function (p) { return p === 'hant' || p === 'tw' || p === 'hk' || p === 'mo'; });
			var want = traditional ? 'zht' : 'zh', other = traditional ? 'zh' : 'zht';
			return offered.indexOf(want) >= 0 ? want : offered.indexOf(other) >= 0 ? other : null;
		}
		base = { iw: 'he', in: 'id' }[base] || base; // older codes some browsers still send
		return offered.indexOf(base) >= 0 ? base : null;
	}

	function storage() {
		try { return w.localStorage || null; } catch (e) { return null; }
	}
	function readSaved(key) {
		var s = storage();
		if (!s) return null;
		try { var v = s.getItem(key); return v == null ? null : JSON.parse(v); } catch (e) { return null; }
	}
	function save(key, value) {
		var s = storage();
		if (s) try { s.setItem(key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
	}
	// saved like /js/progress.js saves a tool's things: every pick on the site, newest first, as "ss1.site.langs" (and
	// the newest alone as "ss1.site.lang"). Before that list, each tool kept its own ("ss1.<tool>.lang"): still read,
	// after the list, so an older pick isn't lost.
	var SITE_KEY = 'ss1.site.lang', LIST_KEY = 'ss1.site.langs';
	var toolKey = function (tool) { return 'ss1.' + tool + '.lang'; };
	function picks() {
		var list = readSaved(LIST_KEY);
		if (Array.isArray(list)) return list;
		var one = readSaved(SITE_KEY);
		return one ? [one] : [];
	}
	function remember(code) {
		var list = [code].concat(picks().filter(function (c) { return c !== code; })).slice(0, 8);
		save(LIST_KEY, list);
		save(SITE_KEY, code);
	}

	function choose(cfg) {
		var offered = cfg.langs, pick = null, i;
		try { pick = match(new URLSearchParams(w.location.search).get('lang'), offered); } catch (e) { /* no query string */ }
		var saved = picks();
		for (i = 0; i < saved.length && !pick; i++) pick = match(saved[i], offered);
		var older = [toolKey(cfg.tool)].concat(cfg.legacy || []);
		for (i = 0; i < older.length && !pick; i++) pick = match(readSaved(older[i]), offered);
		var nav = /** @type {any} */ (w.navigator || {}), prefs = nav.languages && nav.languages.length ? nav.languages : [nav.language];
		for (i = 0; i < prefs.length && !pick; i++) pick = match(prefs[i], offered);
		return pick || 'en';
	}

	/* ---------------- start-up ---------------- */
	var config = { tool: '', langs: ['en'], namesOnly: [], boot: {}, legacy: [] };
	var api = { LANGUAGES: LANGUAGES, WORDS: OWN, info: info, match: match, code: 'en' };

	var translated = function (code) { return config.namesOnly.indexOf(code) < 0; };
	// A language written right to left gets each filled-in value isolated (U+2068 … U+2069), so a value written the
	// other way keeps its own order inside the sentence: "1...d5", "+0.3", "$40" don't come out as "d5...1", "0.3+"
	// (and values joined by a slash, colon or dash, "{score}/{total}", are isolated left to right as one run, so
	// they keep their order: "0/44", not "44/0")
	var isolate = false;
	var RUN = /\{\w+\}(?:[\/:\u2013-]\{\w+\})+/g;
	var fill = function (s, vars) {
		if (vars && isolate) s = String(s).replace(RUN, function (m) { return '\u2066' + m + '\u2069'; });
		return vars ? String(s).replace(/\{(\w+)\}/g, function (m, k) {
			if (!(k in vars)) return m;
			var v = vars[k];
			return isolate && v !== '' && v != null ? '\u2068' + v + '\u2069' : v;
		}) : String(s);
	};
	// <html lang dir>: the interface's language (English while only the names are translated)
	function markPage(code) {
		var root = w.document && w.document.documentElement;
		if (!root) return;
		var l = info(translated(code) ? code : 'en');
		root.lang = l.tag;
		isolate = !!l.rtl;
		if (l.rtl) root.dir = 'rtl';
		else root.removeAttribute('dir');
		// Korean breaks lines only at its spaces, as Korean text does (the browser would break inside its words)
		root.style.wordBreak = /^ko/.test(l.tag) ? 'keep-all' : '';
	}

	/* ---------------- for search engines ---------------- */
	// Each language of a tool has its own address (?lang=de: the sitemap lists them, each with the others as
	// alternates), so the page says which address it is (its canonical link, from the address itself: a visitor whose
	// saved choice opens the plain address in German is still on the English address) and, in another language, its
	// description in that language (the site's own words for each tool, /tools/meta.json, written when the site is
	// built; a tool or language it lacks keeps the English). The page's own HTML has no canonical link for this, as
	// search engines are told not to trust one a script changes.
	var SITE = 'https://samplesize1.com';
	function linkPage() {
		var d = w.document;
		if (!d || !d.head || !w.location) return;
		var own = null;
		try { own = new URL(w.location.href).searchParams.get('lang'); } catch (e) { /* an odd address */ }
		own = own && config.langs.indexOf(own) >= 0 && own !== 'en' && translated(own) ? own : null;
		var link = d.head.querySelector('link[rel="canonical"]');
		if (!link) {
			link = d.createElement('link');
			link.rel = 'canonical';
			d.head.appendChild(link);
		}
		link.href = SITE + w.location.pathname + (own ? '?lang=' + own : '');
	}
	var metaFile = null;
	function describePage(code) {
		var d = w.document;
		if (!d || !w.fetch || !config.tool) return;
		var meta = d.querySelector('meta[name="description"]'), og = d.querySelector('meta[property="og:description"]');
		if (!meta) return;
		if (!meta.hasAttribute('data-en')) meta.setAttribute('data-en', meta.content);
		var put = function (text) {
			meta.content = text;
			if (og) og.content = text;
		};
		if (code === 'en' || !translated(code)) return put(meta.getAttribute('data-en'));
		metaFile = metaFile || w.fetch('/tools/meta.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
		metaFile.then(function (all) {
			var own = all[config.tool] && all[config.tool][code];
			if (own && api.code === code) put(own);
		});
	}

	api.start = function (cfg) {
		config = {
			tool: cfg.tool,
			langs: cfg.langs && cfg.langs.length ? cfg.langs : ['en'],
			namesOnly: cfg.namesOnly || [],
			boot: cfg.boot || {},
			legacy: cfg.legacy || [],
		};
		api.code = choose(config);
		markPage(api.code);
		linkPage();
		describePage(api.code);
		var d = w.document;
		if (d && d.querySelectorAll) {
			var els = d.querySelectorAll('[data-i18n-boot]');
			for (var i = 0; i < els.length; i++) els[i].textContent = api.bootText(els[i].getAttribute('data-i18n-boot'));
		}
		return api.code;
	};
	// start-up text (the loading line, what went wrong) in the language picked, with {name}s filled in
	api.bootText = function (key, vars) {
		var own = config.boot[api.code] || {}, en = config.boot.en || {};
		return fill(key in own ? own[key] : key in en ? en[key] : '', vars);
	};

	/* ---------------- matching typed text ---------------- */
	// Accents and case off, for search and typed answers: "São Tomé" -> "sao tome", "Fuß" -> "fuss". Letters of
	// every alphabet stay (Москва, 東京, القاهرة); the few Latin letters with no accent to take off become the
	// plain letters people type for them.
	var PLAIN = { 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i' };
	api.fold = function (s) {
		return String(s)
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[øæœßłđðþı]/g, function (ch) { return PLAIN[ch]; });
	};

	/* ---------------- the text, for a tool's code ---------------- */
	var files = new Map(); // url -> a promise of its JSON
	function fetchJSON(url) {
		if (!files.has(url)) {
			files.set(url, w.fetch(url).then(function (r) {
				if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
				return r.json();
			}));
			files.get(url).catch(function () { files.delete(url); }); // try again next time
		}
		return files.get(url);
	}

	api.open = async function (options) {
		var layers = options.layers.map(function (l) {
			return { text: l.text || {}, files: l.files ? String(l.files) : '', has: l.has || null };
		});
		// the picker's own words come last, so a tool can say them its own way
		layers.push({ text: OWN.en, own: true });
		var prefix = options.prefix ? options.prefix + '.' : '';
		var listeners = [];
		var state = null; // { code, data: [the files' JSON, one per layer], plural }

		function load(code) {
			if (code === 'en') return Promise.resolve(layers.map(function () { return {}; }));
			return Promise.all(layers.map(function (l) {
				if (l.own) return { ui: (translated(code) && OWN[code]) || {} };
				if (!l.files || (l.has && l.has.indexOf(code) < 0)) return {};
				return fetchJSON(l.files + code + '.json');
			}));
		}
		function use(code, data) {
			var tag = info(translated(code) ? code : 'en').tag, plural;
			try { plural = new Intl.PluralRules(tag); } catch (e) { plural = new Intl.PluralRules('en'); }
			state = { code: code, data: data, plural: plural };
			api.code = code;
		}

		// the text for a key: from the first layer whose English has it (prefixed key first), in the language in use
		function lookup(key) {
			var keys = prefix ? [prefix + key, key] : [key];
			for (var i = 0; i < layers.length; i++) {
				for (var j = 0; j < keys.length; j++) {
					if (!Object.prototype.hasOwnProperty.call(layers[i].text, keys[j])) continue;
					var ui = state.data[i] && state.data[i].ui;
					return ui && Object.prototype.hasOwnProperty.call(ui, keys[j]) ? ui[keys[j]] : layers[i].text[keys[j]];
				}
			}
			return undefined;
		}
		function t(key, vars) {
			var s = lookup(key);
			if (s == null) return key;
			if (typeof s === 'object' && !Array.isArray(s)) {
				var n = Number(vars && vars.n) || 0, form = state.plural.select(n);
				s = '=' + n in s ? s['=' + n] : form in s ? s[form] : s.other; // "=1": exactly one, whatever the language's forms
			}
			return fill(s, vars);
		}
		function list(key, vars) {
			var s = lookup(key);
			return Array.isArray(s) ? s.map(function (x) { return fill(x, vars); }) : [];
		}

		// a language's name, in the language of the interface: "German", or "allemand" in French
		function nameIn(code, inTag) {
			var tag = info(code).tag.replace(/-[A-Z]{2}$/, ''); // "Portuguese", not "Brazilian Portuguese"
			try { return new Intl.DisplayNames([inTag], { type: 'language' }).of(tag) || ''; } catch (e) { return ''; }
		}

		var linkHTML = new WeakMap(); // a data-i18n-html element -> its links, kept from the page's own markup
		function apply(root) {
			root = root || w.document;
			var each = function (sel, fn) { var els = root.querySelectorAll(sel); for (var i = 0; i < els.length; i++) fn(els[i]); };
			each('[data-i18n]', function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
			each('[data-i18n-title]', function (el) { el.title = t(el.getAttribute('data-i18n-title')); });
			each('[data-i18n-aria]', function (el) { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'))); });
			each('[data-i18n-ph]', function (el) { el.placeholder = t(el.getAttribute('data-i18n-ph')); });
			each('[data-i18n-html]', function (el) {
				if (!linkHTML.has(el)) {
					var links = {}, as = el.querySelectorAll('a[data-i18n-link]');
					for (var i = 0; i < as.length; i++) links[as[i].getAttribute('data-i18n-link')] = as[i].outerHTML;
					linkHTML.set(el, links);
				}
				el.innerHTML = t(el.getAttribute('data-i18n-html'), linkHTML.get(el));
			});
		}

		// the menu: each language in its own name, then in the interface's ("Deutsch (German)"); the note under it
		var page = function () { return !!(w.document && w.document.querySelectorAll); }; // (not in unit tests)
		var $ = function (id) { return page() ? w.document.getElementById(id) : null; };
		function note(text) {
			var n = $('langNote');
			if (!n) return;
			n.textContent = text;
			n.hidden = !text;
		}
		function picker() {
			var sel = $('langSel');
			if (!sel) return;
			var uiTag = lang.tag;
			sel.replaceChildren.apply(sel, config.langs.map(function (code) {
				var o = w.document.createElement('option'), own = info(code).name, here = nameIn(code, uiTag);
				o.value = code;
				o.lang = info(code).tag;
				o.textContent = !here || here.toLowerCase() === own.toLowerCase() ? own : own + ' (' + here + ')';
				return o;
			}));
			sel.value = state.code;
			var box = $('langBox');
			if (box) box.hidden = config.langs.length < 2;
			if (translated(state.code)) note(t('lang_note'));
			else {
				var custom = state.data.filter(function (d) { return d && d.note; })[0];
				note(custom ? custom.note : t('names_note', { lang: nameIn(state.code, 'en') || info(state.code).name }));
			}
		}

		var lang = {
			get code() { return state.code; },
			// the interface's language, as a BCP 47 tag (English while only the names are translated)
			get tag() { return info(translated(state.code) ? state.code : 'en').tag; },
			// the names' language, for sorting and capital letters
			get locale() { return info(state.code).tag; },
			get translated() { return translated(state.code); },
			get offered() { return config.langs.slice(); },
			t: t,
			list: list,
			has: function (key) { return lookup(key) != null; },
			// the JSON of layer i's file in the language in use ({} for English)
			file: function (i) { return state.data[i || 0] || {}; },
			// "Left femur" -> "left femur" mid-sentence (not in German, where nouns keep their capital)
			midSentence: function (s) {
				return info(state.code).nouns ? s : String(s).replace(/^(\p{Lu})(?=\p{Ll})/u, function (c) { return c.toLocaleLowerCase(lang.locale); });
			},
			fold: api.fold,
			// a list in a sentence, the language's way: ['A', 'B', 'C'] -> "A, B and C" ("A, B et C" in French); with 'or',
			// "A, B or C". The site's English writes lists without a comma before "and"/"or", as British English does.
			join: function (items, or) {
				try { return new Intl.ListFormat(lang.tag === 'en' ? 'en-GB' : lang.tag, { type: or === 'or' ? 'disjunction' : 'conjunction' }).format(items); } catch (e) { return items.join(', '); }
			},
			apply: apply,
			onChange: function (fn) { listeners.push(fn); },
			// switch: loads the files, saves the choice, redraws the page's fixed text, then tells the tool
			set: async function (code) {
				code = match(code, config.langs);
				if (!code || code === state.code) return false;
				var data;
				try { data = await load(code); } catch (e) {
					console.warn(e);
					note(t('lang_load_fail'));
					var sel = $('langSel');
					if (sel) sel.value = state.code;
					return false;
				}
				use(code, data);
				remember(code);
				// the address says the language, so a link copied from it opens in it
				try {
					var url = new URL(w.location.href);
					url.searchParams.set('lang', code);
					w.history.replaceState(w.history.state, '', url);
				} catch (e) { /* no history (a test page) */ }
				markPage(code);
				linkPage();
				describePage(code);
				if (page()) { apply(); picker(); }
				relabelCredits();
				for (var i = 0; i < listeners.length; i++) listeners[i](lang);
				return true;
			},
		};

		var first = api.code, data;
		try { data = await load(first); } catch (e) {
			console.warn(e); // offline, say: English, which needs no files
			first = 'en';
			data = await load('en');
		}
		use(first, data);
		markPage(first);
		relabelCredits();
		if (page()) {
			apply();
			picker();
			var sel = $('langSel');
			if (sel) sel.addEventListener('change', function () { lang.set(sel.value); });
		}
		return lang;
	};

	addStyle();
	startCredits();
	w.SiteLanguage = api;
})(window);
