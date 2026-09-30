"use strict";

// The machinery both equivalence suites share: the helpers installed into the
// page (an engine is the only thing that can say two spellings mean the same),
// and the comparisons built on what they report. Nothing here knows which
// corpus it is reading — `configCases` and `test/external/wpt` go through one path, so
// an inline `<style>` is held to exactly the same standard as a `.css` file.

const fs = require("fs");
const path = require("path");
// Read from the comparisons, so a fixture added to one is added here.
const {
	CACHE: CSS_CACHE,
	GENERATED_FIXTURES,
	INSTALLED_FIXTURES
} = require("../../tooling/compare-css-tools");
const {
	APP_SHELL,
	CACHE: HTML_CACHE,
	INLINED_STYLESHEETS,
	INSTALLED_DOCUMENTS,
	SPRITE_WITHIN,
	TAG_SOUP,
	WEB_COMPONENTS,
	inlineCssPage,
	spritePage
} = require("../../tooling/compare-html-tools");

/** @typedef {{ name: string, raw: string, min: string }} Fixture */

/**
 * Every fixture of one extension under a directory. Synchronous: jest needs one
 * test name per fixture while it collects, which is before it can await.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @returns {string[]} sorted fixture paths
 */
const collectFixtures = (dir, extension) => {
	/** @type {string[]} */
	const files = [];
	/**
	 * @param {string} current directory to read
	 * @returns {void}
	 */
	const walk = (current) => {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name.endsWith(extension)) files.push(full);
		}
	};
	walk(dir);
	return files.sort();
};

/**
 * Load fixtures and minify each one on its own — concatenating first would let a
 * deliberately malformed page corrupt every fixture after it.
 * @param {string} dir directory to read
 * @param {string} extension file extension including the dot
 * @param {(source: string) => string} minify the printer to run
 * @returns {Fixture[]} the corpus
 */
const buildCorpus = (dir, extension, minify) => {
	const files = collectFixtures(dir, extension);
	return files.map((file) => {
		const raw = fs.readFileSync(file, "utf8");
		return {
			name: path
				.relative(path.join(__dirname, "../.."), file)
				.replace(/\\/g, "/"),
			raw,
			min: minify(raw)
		};
	});
};

/**
 * Read a benchmark cache as a corpus. A file the cache does not hold is left
 * out: each cache is built by the comparison that installs it.
 * @param {string} cache the cache directory
 * @param {[string, string][]} entries `[label, path within the cache]`
 * @param {(source: string) => string} minify the printer to run
 * @returns {Fixture[]} the corpus, empty when the cache is not there
 */
const readBenchmarkCache = (cache, entries, minify) => {
	/** @type {Fixture[]} */
	const out = [];
	for (const [label, within] of entries) {
		const file = path.join(cache, within);
		if (!fs.existsSync(file)) continue;
		const raw = fs.readFileSync(file, "utf8");
		out.push({ name: label, raw, min: minify(raw) });
	}
	return out;
};

/**
 * The stylesheets `yarn benchmark:css-tools` installs and builds.
 * @param {(source: string) => string} minify the printer to run
 * @returns {Fixture[]} the corpus, empty until that has been run once
 */
const benchmarkStylesheets = (minify) =>
	readBenchmarkCache(
		CSS_CACHE,
		[
			...INSTALLED_FIXTURES.map(
				(/** @type {[string, string]} */ [label, file]) =>
					/** @type {[string, string]} */ ([label, `node_modules/${file}`])
			),
			...GENERATED_FIXTURES
		],
		minify
	);

// Written rather than installed, each carrying a construct no shipped page
// here reaches: recovery from malformed markup, and a declarative shadow root.
/** @type {[string, string][]} */
const WRITTEN_DOCUMENTS = [
	["Tag soup", TAG_SOUP],
	["Web components", WEB_COMPONENTS]
];

/**
 * The documents `yarn benchmark:html-tools` installs, and the pages it builds
 * around a whole framework stylesheet. Those pages are the ones carrying a
 * `<style>`, which is what reaches the css minifier nested in the html one.
 * The comparison's bulk pages are left out: what they carry is size rather than
 * a construct, and building them would cost that at collection time.
 * @param {(source: string) => string} minify the printer to run
 * @returns {Fixture[]} the corpus, empty until that has been run once
 */
const benchmarkDocuments = (minify) => {
	const out = readBenchmarkCache(
		HTML_CACHE,
		INSTALLED_DOCUMENTS.map(
			(/** @type {[string, string]} */ [label, file]) =>
				/** @type {[string, string]} */ ([label, `node_modules/${file}`])
		),
		minify
	);
	if (out.length > 0) {
		out.push({
			name: "App shell (inline critical CSS)",
			raw: APP_SHELL,
			min: minify(APP_SHELL)
		});
	}
	for (const [label, file] of INLINED_STYLESHEETS) {
		const sheet = path.join(HTML_CACHE, "node_modules", file);
		if (!fs.existsSync(sheet)) continue;
		const raw = inlineCssPage(label, fs.readFileSync(sheet, "utf8"));
		out.push({ name: label, raw, min: minify(raw) });
	}
	// The sprite is a shipped SVG rather than a written one, so it is read out of
	// the cache like an installed document.
	const sprite = path.join(HTML_CACHE, "node_modules", SPRITE_WITHIN);
	if (fs.existsSync(sprite)) {
		const raw = spritePage(fs.readFileSync(sprite, "utf8"));
		out.push({ name: "Icon sprite (inlined SVG)", raw, min: minify(raw) });
	}
	if (out.length > 0) {
		for (const [name, raw] of WRITTEN_DOCUMENTS) {
			out.push({ name, raw, min: minify(raw) });
		}
	}
	return out;
};

/** @typedef {{ facets: Record<string, string[]>, styles: string[] }} Facets */

/**
 * @typedef {object} PageHelpers
 * @property {(html: string) => Facets} htmlFacets everything a page's DOM is made of
 * @property {(tagName: string, attribute: string, value: string | null) => [string | undefined, unknown]} probeReflection the IDL member an attribute reflects, and its value
 * @property {(value: string) => string} canonical a value under the one name the spec gives it
 * @property {(value: string) => string} paintedColors a value with every color it holds painted
 * @property {(value: string) => string} normalizeValue a value spelled one way, for what is compared as written
 * @property {(property: string, value: string) => string} cascadeValue a computed value in the one spelling rules are compared in
 */

/**
 * Installed once into the page. Everything both suites need lives here so an
 * inline `<style>` is held to exactly the same standard as a `.css` file.
 * @param {string[]} generics the generic font families, from `lib/css/data.js`
 * @returns {void}
 */
const installHelpers = (generics) => {
	const NS_HTML = "http://www.w3.org/1999/xhtml";
	const NS_SVG = "http://www.w3.org/2000/svg";
	const probe = document.createElement("div");
	const canvas = document.createElement("canvas");
	canvas.width = 1;
	canvas.height = 1;
	const context = /** @type {CanvasRenderingContext2D} */ (
		canvas.getContext("2d", { willReadFrequently: true })
	);
	document.body.append(probe);

	// Every absolute unit is a fixed multiple of another, so one spelling stands
	// for all of them: 1in is 96px, 1pt is 96/72px, 1turn is 360deg, 1s is 1000ms.
	/** @type {Map<string, [number, string]>} */
	const UNITS = new Map([
		["px", [1, "px"]],
		["pt", [96 / 72, "px"]],
		["pc", [16, "px"]],
		["in", [96, "px"]],
		["cm", [96 / 2.54, "px"]],
		["mm", [96 / 25.4, "px"]],
		["q", [96 / 101.6, "px"]],
		["deg", [1, "deg"]],
		["grad", [0.9, "deg"]],
		["rad", [180 / Math.PI, "deg"]],
		["turn", [360, "deg"]],
		["s", [1000, "ms"]],
		["ms", [1, "ms"]]
	]);

	/**
	 * The pixel a color paints as. A color carried in one space and the same
	 * color carried in another are one color if the engine paints them alike —
	 * which is what `lch()` rewritten to sRGB has to mean — and the computed value
	 * keeps the space, so it cannot answer that on its own.
	 * @param {string} value a computed value
	 * @returns {string} the value, or the pixel when it is a color
	 */
	const painted = (value) => {
		// An assignment the engine rejects leaves the previous color in place, so
		// a value is a color only when it reads back the same from either start.
		context.fillStyle = "#000";
		context.fillStyle = value;
		const fromBlack = context.fillStyle;
		context.fillStyle = "#fff";
		context.fillStyle = value;
		if (context.fillStyle !== fromBlack) return value;
		context.clearRect(0, 0, 1, 1);
		context.fillRect(0, 0, 1, 1);
		return `paints ${[...context.getImageData(0, 0, 1, 1).data].join(",")}`;
	};

	/**
	 * Rewrite only what stands outside a string or a `url()` body, where a
	 * color-shaped token is text.
	 * @param {string} value a value
	 * @param {(run: string) => string} rewrite what to do with the rest
	 * @returns {string} the value, rewritten in place
	 */
	const outsideText = (value, rewrite) => {
		let out = "";
		let run = "";
		for (let at = 0; at < value.length; at++) {
			const ch = value[at];
			const url = /^url\(/i.test(value.slice(at, at + 4));
			if (ch === '"' || ch === "'" || url) {
				out += rewrite(run);
				run = "";
				const from = at;
				// CSS Syntax 4.3.6: only a quote opening the body makes it a string;
				// one met later is a parse error whose recovery ends at the next `)`.
				let quote = url ? "" : ch;
				if (url) {
					at += 3;
					while (/[\t\n\f\r ]/.test(value[at + 1] || "")) at++;
					const opens = value[at + 1];
					if (opens === '"' || opens === "'") {
						quote = opens;
						at++;
					}
				}
				const end = quote === "" ? ")" : quote;
				for (at += 1; at < value.length; at++) {
					if (value[at] === "\\") at++;
					else if (value[at] === end) break;
				}
				// A quoted body leaves the call's own `)` still to step over.
				if (url && quote !== "") {
					while (at < value.length && value[at] !== ")") at++;
				}
				out += value.slice(from, at + 1);
				continue;
			}
			run += ch;
		}
		return out + rewrite(run);
	};

	// A color token, and the whole of a color function that holds no call of its
	// own — which is every spelling but a nested `calc()`.
	const COLOR_TOKEN_RE =
		/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\([^()]*\)/gi;

	// One word, so a number with its unit is read whole rather than as an ident.
	const WORD_RE = /[\w-]/;

	// CSS Syntax §4.2: a name code point is also anything non-ASCII, which the
	// token after a color can start with.
	const NAME_RE = /[\w-]|[\u0080-\uFFFF]/;

	/**
	 * Every color a value holds, as the pixel it paints. A color the engine hands
	 * back as written — a `var()` fallback, the one `image()` carries — is a color
	 * still, and two spellings of it are one value. A bare keyword counts only
	 * inside a call, where it is an argument: `font-family:red` names a family.
	 * `currentcolor` is never painted, since the pixel it takes is the element's.
	 * @param {string} value a value
	 * @returns {string} the value, its colors painted
	 */
	const paintedColors = (value) =>
		outsideText(value, (run) => {
			let out = "";
			let word = "";
			let depth = 0;
			const take = () => {
				out +=
					depth > 0 && word !== "" && !/^currentcolor$/i.test(word)
						? painted(word)
						: word;
				word = "";
			};
			// A pixel ends in a channel, so `rgba(…)0` — the form the printer writes,
			// since the `)` parts them — would read as one channel more.
			const painting = run.replace(
				COLOR_TOKEN_RE,
				(color, at, whole) =>
					`${painted(color)}${
						NAME_RE.test(whole[at + color.length] || "") ? " " : ""
					}`
			);
			for (const ch of painting) {
				if (WORD_RE.test(ch)) {
					word += ch;
					continue;
				}
				take();
				if (ch === "(") depth++;
				else if (ch === ")" && depth > 0) depth--;
				out += ch;
			}
			take();
			return out;
		});

	// The three code points CSS Syntax §3.3 calls a newline, `\r\n` included.
	const NEWLINE = /[\n\r\f]/;

	/**
	 * The escape starting at `text[at]` — a backslash — decoded, with the index
	 * just past it. A hex escape takes up to six digits and swallows one
	 * whitespace after them; anything else names the next character itself.
	 * @param {string} text the text being read
	 * @param {number} at the index of the backslash
	 * @returns {[string, number]} the character it names, and where it ends
	 */
	const readEscape = (text, at) => {
		const hex = /^[\da-f]{1,6}/i.exec(text.slice(at + 1, at + 7));
		if (hex === null) {
			const next = text[at + 1];
			return next === undefined ? ["\uFFFD", at + 1] : [next, at + 2];
		}
		let end = at + 1 + hex[0].length;
		if (/[\t\n\f\r ]/.test(text[end])) end++;
		const code = Number.parseInt(hex[0], 16);
		// §4.3.7: zero, a surrogate and anything past the maximum all name U+FFFD.
		const named =
			code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)
				? "\uFFFD"
				: String.fromCodePoint(code);
		return [named, end];
	};

	// cspell:ignore rlh rcap cqmin cqmax vmin vmax dvmin dvmax lvmin lvmax svmin svmax
	// Every length unit CSS Values 4 states, longest first so `vmin` is not read
	// as `vm` — a zero is the same zero in any of them.
	const LENGTH_UNITS = [
		"cqmin",
		"cqmax",
		"svmin",
		"svmax",
		"lvmin",
		"lvmax",
		"dvmin",
		"dvmax",
		"rcap",
		"vmin",
		"vmax",
		"cap",
		"rlh",
		"rem",
		"rex",
		"rch",
		"ric",
		"svw",
		"svh",
		"svi",
		"svb",
		"lvw",
		"lvh",
		"lvi",
		"lvb",
		"dvw",
		"dvh",
		"dvi",
		"dvb",
		"cqw",
		"cqh",
		"cqi",
		"cqb",
		"px",
		"cm",
		"mm",
		"in",
		"pt",
		"pc",
		"em",
		"ex",
		"ch",
		"ic",
		"lh",
		"vw",
		"vh",
		"vi",
		"vb",
		"q"
	];
	// A unit runs on through `-`, an escape and any non-ASCII name character, so
	// `\b` would read `0rcap-foo` as `0rcap` and hand back a value nothing wrote.
	const ZERO_LENGTH_RE = new RegExp(
		`(^|[^\\w.#%-])0(?:\\.0*)?(?:${LENGTH_UNITS.join("|")})(?![\\w\\u00a0-\\uffff\\\\-])`,
		"gi"
	);

	// A character an escape can be dropped from without the value reading
	// differently — everything a name is spelled out of.
	const BARE_ESCAPED = /[\w\u00A0-\uFFFF-]/;

	// What a math operator's own whitespace is held under while the delimiters
	// beside it lose theirs (see `normalizeValue`). §4.3.7 names U+FFFD for a
	// null escape and §3.3 for a null the source spells, so no value holds one.
	const MATH_OPERATOR_SPACE = "\u0000";

	/**
	 * A value spelled one way, for the values that have to be compared as written
	 * rather than as computed. CSS does not need the whitespace around a `,`, a
	 * bracket, a `*` or a `/`, and a string means the same in either quote —
	 * `calc()` does need the space around `+` and `-`, and a string's own
	 * whitespace is its content.
	 * @param {string} text a specified value
	 * @returns {string} the same value, spelled one way
	 */
	const normalizeValue = (text) => {
		let out = "";
		let quote = "";
		let string = "";
		// Where the last string ended, so the space after one is dropped too.
		let closed = -1;
		/** @type {string[]} */
		const open = [];
		for (let at = 0; at < text.length; at++) {
			const ch = text[at];
			// A comment separates tokens and says nothing else, so it reads as the
			// whitespace it stands in for.
			if (quote === "" && ch === "/" && text[at + 1] === "*") {
				const end = text.indexOf("*/", at + 2);
				at = end === -1 ? text.length : end + 1;
				if (!out.endsWith(" ")) out += " ";
				continue;
			}
			// A CSS escape is resolved before a name is matched, so `\2d-two` and
			// `\2d\2d two` are one identifier — decoded here, and written back escaped in a
			// single spelling where the character would otherwise read as punctuation.
			if (ch === "\\") {
				// §4.3.4: a `\` before a newline continues the string's line — the pair
				// names nothing, unlike every other escape.
				if (quote !== "" && NEWLINE.test(text[at + 1] || "")) {
					if (text[at + 1] === "\r" && text[at + 2] === "\n") at++;
					at++;
					continue;
				}
				const [named, end] = readEscape(text, at);
				// §4.3.4: a `\` a string runs out after names nothing, unlike the
				// U+FFFD the same escape names anywhere else.
				const ranOut = end === at + 1;
				at = end - 1;
				const code = /** @type {number} */ (named.codePointAt(0));
				const written = BARE_ESCAPED.test(named)
					? named
					: `\\${code.toString(16).padStart(6, "0")}`;
				if (quote === "") out += written;
				else if (!ranOut) string += named;
				continue;
			}
			if (quote !== "") {
				if (ch === quote) {
					out += JSON.stringify(string);
					quote = "";
					closed = out.length;
				} else {
					string += ch;
				}
			} else if (ch === '"' || ch === "'") {
				// A string, or a hash after a space, starts a token no neighbor joins,
				// so the space beside one separates nothing.
				if (out.endsWith(" ")) out = out.slice(0, -1);
				quote = ch;
				string = "";
			} else if (/[\t\n\f\r ]/.test(ch)) {
				if (!out.endsWith(" ") && closed !== out.length) out += " ";
			} else {
				if (ch === "#" && out.endsWith(" ")) out = out.slice(0, -1);
				if (ch === "(") open.push(")");
				else if (ch === "[") open.push("]");
				else if (ch === "{") open.push("}");
				else if (open[open.length - 1] === ch) open.pop();
				out += ch;
			}
		}
		if (quote !== "") out += JSON.stringify(string);
		// CSS Syntax §4.3.1 and §5.4.9: a string, a function and a block left open
		// at the end of the input are closed there, so an engine echoing the value
		// back without those closers means the same as a printer writing them.
		while (open.length > 0) out += /** @type {string} */ (open.pop());
		// Arithmetic nothing has to substitute into is arithmetic the engine can
		// do now, and both spellings reach the same answer.
		out = out.replace(/calc\([^()]*\)/g, (call, offset) => {
			try {
				const folded = CSSNumericValue.parse(call).toString();
				// A `calc()` left holding one term is that term, still parted from a
				// name after it as the `)` parted them.
				const single = /^calc\((-?[\d.]+[a-z%]*)\)$/i.exec(folded);
				if (single === null) return folded;
				const next = out[offset + call.length] || "";
				return /[\w\u0080-\uFFFF#.-]/.test(next) ? `${single[1]} ` : single[1];
			} catch (_err) {
				return call;
			}
		});
		// CSS Color 4 §5: `transparent` is that color written as a keyword, and an
		// engine echoing a descriptor hands back whichever spelling it was given.
		out = out.replace(/(^|[^\w-])transparent(?![\w-])/gi, "$1rgba(0, 0, 0, 0)");
		// A string is text and a `url()` body names something, so neither holds a
		// color: `url(#fff)` and `url(#ffffff)` are two different elements.
		out = paintedColors(out);
		return (
			out
				// WHY: a `+` or `-` spelled with whitespace on both sides is the math
				// operator CSS Values 4 §10.1 requires that whitespace for, not a sign.
				// Held aside first, or the rule below reads `) - ` as a space beside a
				// delimiter and drops it — which is how `calc(var(--a) - var(--b))` and
				// the invalid `calc(var(--a)- var(--b))` read as one value (#22149).
				.replace(/ ([+-]) /g, `${MATH_OPERATOR_SPACE}$1${MATH_OPERATOR_SPACE}`)
				// Nothing fuses with a comma or a block's delimiters, so the whitespace
				// beside one says only what the delimiter already does.
				.replace(/ ?([,()[\]{}*/]) ?/g, "$1")
				.split(MATH_OPERATOR_SPACE)
				.join(" ")
				// `.25` and `0.25` are one number, and an absolute unit converts to px,
				// degrees or seconds exactly — the spec fixes every ratio.
				.replace(
					/(^|[^\w.%-])(\d*\.?\d+)(px|pt|pc|in|cm|mm|q|deg|grad|rad|turn|s|ms)\b/gi,
					(all, before, number, unit) => {
						const scale = UNITS.get(unit.toLowerCase());
						if (scale === undefined) return all;
						const size = Number(number) * scale[0];
						return `${before}${Number(size.toFixed(6))}${scale[1]}`;
					}
				)
				.replace(/(^|[^\w.%-])0*(\.\d)/g, "$10$2")
				// A zero length is the same zero however it is spelled, and a value
				// held as written is the one place the printer's `0px` → `0` shows.
				.replace(ZERO_LENGTH_RE, "$10")
				.trim()
		);
	};

	// The spec defines each easing keyword as the function it stands for, so the
	// two spellings are one value however the engine echoes them back.
	const EASINGS = new Map([
		["ease", "cubic-bezier(0.25, 0.1, 0.25, 1)"],
		["linear", "cubic-bezier(0, 0, 1, 1)"],
		["ease-in", "cubic-bezier(0.42, 0, 1, 1)"],
		["ease-out", "cubic-bezier(0, 0, 0.58, 1)"],
		["ease-in-out", "cubic-bezier(0.42, 0, 0.58, 1)"],
		["step-start", "steps(1, start)"],
		["step-end", "steps(1, end)"]
	]);

	// A generic family is a keyword, so quoting one names a font of that name
	// instead, and the quoting is what tells the two apart. `CssSyntax.unittest`
	// holds the printer to the same rule.
	const GENERIC_FAMILIES = new Set(generics);

	/**
	 * A font family list with every name the bare spelling would also name left
	 * unquoted. CSS Fonts 4 §2.2 makes the two the same family, and the engines
	 * disagree about which to echo.
	 * @param {string} list a `font-family` or `font` value
	 * @returns {string} the same list, quoted once
	 */
	const unquoteFamilies = (list) =>
		list.replace(
			/"((?:[A-Za-z_-][\w-]*)(?: [A-Za-z_-][\w-]*)*)"/g,
			(quoted, name) =>
				GENERIC_FAMILIES.has(name.toLowerCase()) ? quoted : name
		);

	/**
	 * The one spelling of a value the spec gives several names: an easing keyword
	 * is the curve it stands for, `jump-start` names the step position `start`
	 * does, and a gradient's last color stop is at the end of the gradient line
	 * whether or not it says so (CSS Images 3 §3.4.3). A two-position stop needs
	 * nothing here: the engine expands it into the two stops itself.
	 * @param {string} value a value
	 * @returns {string} the same value, named once
	 */
	const canonical = (value) => {
		// The step-position synonym is resolved first, so the result is a curve the
		// table can name. A list names one easing per layer, so every spelling in
		// it is replaced.
		let named = value.replace(/\bjump-(start|end)\b/g, "$1");
		for (const [keyword, curve] of EASINGS) {
			named = named.split(curve).join(keyword);
		}
		// Anchored left: a prefixed gradient folds under its own rules, so
		// canonicalizing one would hide a fold the printer must not make.
		return named.replace(
			/(^|[^\w-])((?:repeating-)?(?:linear|radial|conic)-gradient\([^()]*(?:\([^()]*\)[^()]*)*)\s(?:100%|360deg)\)/gi,
			"$1$2)"
		);
	};

	/** @type {Map<string, string | undefined>} */
	const reflections = new Map();

	/**
	 * The IDL property an attribute reflects through, so the engine's own parse of
	 * the value can be read back: `colspan` is a `number`, a boolean attribute is
	 * a `boolean`, and a set of space-separated tokens is a `DOMTokenList`
	 * whatever element it sits on (`sizes` is one on `<link>` but a
	 * comma-separated list on `<img>`).
	 * @param {Element} node the element carrying it
	 * @param {string} name the attribute name
	 * @returns {string | undefined} the property name, if it reflects
	 */
	const reflectionOf = (node, name) => {
		const key = `${node.localName} ${name}`;
		if (reflections.has(key)) return reflections.get(key);
		// `class` and `for` are the two reflections whose IDL name is not the
		// attribute name with the case put back, and an attribute reflected both
		// ways (`rel` / `relList`) is read as the token list.
		const camel = name.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
		/** @type {string[]} */
		let candidates = [`${camel}List`, camel];
		if (name === "class") candidates = ["classList"];
		else if (name === "for") candidates = ["htmlFor"];
		/** @type {string | undefined} */
		let found;
		for (const candidate of candidates) {
			if (candidate in node) {
				found = candidate;
				break;
			}
		}
		// A `colspan` reflects as `colSpan`, which no rule spells out.
		for (
			let proto = Object.getPrototypeOf(node);
			proto !== null && found === undefined;
			proto = Object.getPrototypeOf(proto)
		) {
			for (const property of Object.getOwnPropertyNames(proto)) {
				if (property.toLowerCase() === name) {
					found = property;
					break;
				}
			}
		}
		reflections.set(key, found);
		return found;
	};

	// Written from the HTML spec's value grammars rather than from `lib/html/data.js`,
	// so the minifier is checked against the spec and not against its own idea of it.
	// Leading and trailing ASCII whitespace goes, then every tab and newline.
	const URL_ATTRIBUTES = new Set([
		"action",
		"background",
		"cite",
		"codebase",
		"data",
		"formaction",
		"href",
		"itemid",
		"longdesc",
		"lowsrc",
		"manifest",
		"poster",
		"profile",
		"src"
	]);
	// A comma-separated list whose items are each stripped of leading and trailing
	// ASCII whitespace, and whose empty items are skipped.
	const COMMA_LIST_ATTRIBUTES = new Set([
		"accept",
		"coords",
		"imagesizes",
		"imagesrcset",
		"sizes",
		"srcset"
	]);
	// An image candidate list, whose url is read as "characters that are not
	// ASCII whitespace" and whose descriptors are then tokenized by skipping
	// whitespace — so a run of it between the two carries nothing.
	const SRCSET_ATTRIBUTES = new Set(["imagesrcset", "srcset"]);
	// A space-separated list the engine does not reflect as a DOMTokenList, so
	// the whitespace between its tokens is read here rather than by the engine.
	const TOKEN_LIST_ATTRIBUTES = new Set([
		"accesskey",
		"headers",
		"itemprop",
		"itemref",
		"itemtype",
		"ping"
	]);
	// Of those, the ones the spec reflects as a `DOMTokenList` — a set, so a
	// repeat names nothing — which this engine implements no IDL member for.
	const UNIQUE_TOKEN_LIST_ATTRIBUTES = new Set([
		"itemprop",
		"itemref",
		"itemtype"
	]);
	// Set by its presence alone, and parsed by the rules for non-negative
	// integers — for attributes this engine reflects no IDL property for.
	const BOOLEAN_ATTRIBUTES = new Set([
		"alpha",
		"controls",
		"headingreset",
		"itemscope"
	]);
	const INTEGER_ATTRIBUTES = new Set(["headingoffset"]);
	// A dimension value: leading whitespace is skipped and the number is read
	// digit by digit, so leading zeros carry nothing — but a trailing `%` does.
	const DIMENSION_ATTRIBUTES = new Set(["height", "width"]);

	/**
	 * An attribute value with everything the spec calls insignificant removed, so
	 * a respelling the engine folds away compares equal.
	 * @param {Element} node the element carrying it
	 * @param {Attr} attribute the attribute
	 * @returns {string} its normalized value
	 */
	const value = (node, attribute) => {
		const name = attribute.name;
		const raw = attribute.value;
		if (attribute.namespaceURI !== null) return raw;
		// What it does is the render tier's to compare, in the page it styles.
		if (name === "style") return "";
		const property = reflectionOf(node, name);
		const properties = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (node)
		);
		const reflected = property === undefined ? undefined : properties[property];
		if (typeof reflected === "boolean") return "";
		if (typeof reflected === "number") return String(reflected);
		if (reflected instanceof DOMTokenList) {
			return [...reflected].sort().join(" ");
		}
		if (BOOLEAN_ATTRIBUTES.has(name)) return "";
		if (INTEGER_ATTRIBUTES.has(name)) return String(Number.parseInt(raw, 10));
		if (DIMENSION_ATTRIBUTES.has(name)) {
			const parsed = /^[\t\n\f\r ]*(\d+(?:\.\d+)?)([%*]?)/.exec(raw);
			return parsed === null
				? raw
				: `${Number.parseFloat(parsed[1])}${parsed[2]}`;
		}
		if (URL_ATTRIBUTES.has(name)) return raw.replace(/[\t\n\r]/g, "").trim();
		if (TOKEN_LIST_ATTRIBUTES.has(name)) {
			const tokens = raw.split(/[\t\n\f\r ]+/).filter(Boolean);
			const read = UNIQUE_TOKEN_LIST_ATTRIBUTES.has(name)
				? [...new Set(tokens)]
				: tokens;
			return read.sort().join(" ");
		}
		// The viewport meta is a comma-separated list of `key=value` pairs; every
		// other `content` is opaque text.
		if (
			COMMA_LIST_ATTRIBUTES.has(name) ||
			(name === "content" &&
				node.localName === "meta" &&
				(node.getAttribute("name") || "").toLowerCase() === "viewport")
		) {
			const squeeze = SRCSET_ATTRIBUTES.has(name);
			return raw
				.split(",")
				.map((one) => {
					const held = one.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");
					return squeeze ? held.replace(/[\t\n\f\r ]+/g, " ") : held;
				})
				.filter(Boolean)
				.join(",");
		}
		// Last: what the engine itself reads the attribute as. An ordinary reflection
		// hands the raw value back unchanged; one limited to known values hands back its
		// canonical keyword, which is all that folding an enumerated value can alter.
		if (typeof reflected === "string") return reflected;
		return raw;
	};

	/**
	 * An element as depth, namespace, name and attributes — everything the parser
	 * must build the same, and nothing the printer may respell. Attribute order,
	 * quoting, entity spelling and omitted end tags are all free to differ. The
	 * depth is what makes the flat element list in document order stand for the
	 * tree, so re-parenting cannot pass unseen.
	 * @param {Element} node an element
	 * @param {number} depth how deep it sits
	 * @returns {string} its shape
	 */
	const shapeOf = (node, depth) =>
		`${depth}|${node.namespaceURI}|${node.localName}[${[...node.attributes]
			.map((one) => `${one.name}=${value(node, one)}`)
			.sort()
			.join(",")}]`;

	/**
	 * The text a subtree renders. A `<script>` / `<style>` body is data, compared
	 * as CSS or JSON in its own right.
	 * @param {ParentNode & Node} root the subtree
	 * @returns {string} its rendered text
	 */
	const renderedTextOf = (root) => {
		// A `ShadowRoot` cannot be cloned, so its children are moved into a
		// fragment that can be — the text below is the same either way.
		const clone = /** @type {ParentNode & Node} */ (
			root.nodeType === Node.DOCUMENT_FRAGMENT_NODE && "host" in root
				? (() => {
						const fragment = document.createDocumentFragment();
						for (const child of root.childNodes) {
							fragment.append(child.cloneNode(true));
						}
						return fragment;
					})()
				: root.cloneNode(true)
		);
		for (const el of clone.querySelectorAll("script,style")) el.remove();
		return clone.textContent || "";
	};

	/**
	 * Every part of a page's DOM, split by kind so a mismatch says which. A
	 * `<style>` body is read as CSS and a JSON `<script>` as JSON, because both
	 * are minified in their own right; every other script body is data and must
	 * survive byte for byte.
	 * @param {string} source the page
	 * @returns {Facets} its facets
	 */
	const htmlFacets = (source) => {
		// HTML §13.2.3.1: the decoder consumes a leading byte order mark, which a
		// string handed to the parser would keep as text.
		const html = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
		// `parseHTMLUnsafe` attaches a declarative shadow root where `DOMParser`
		// leaves an inert `<template>`, so the tree below is the one a page gets.
		const attached =
			typeof Document.parseHTMLUnsafe === "function"
				? Document.parseHTMLUnsafe(html)
				: null;
		const doc =
			attached === null
				? new DOMParser().parseFromString(html, "text/html")
				: attached;
		/** @type {Record<string, string[]>} */
		const facets = {
			elements: [],
			ownText: [],
			comments: [],
			scripts: [],
			templates: [],
			shadows: []
		};
		/** @type {string[]} */
		const styles = [];
		/**
		 * @param {ParentNode} root the subtree root
		 * @param {number} depth how deep its children sit
		 * @param {boolean} renders whether text here reaches the page
		 */
		const collect = (root, depth, renders) => {
			for (const node of root.childNodes) {
				if (node.nodeType === Node.COMMENT_NODE) {
					facets.comments.push(/** @type {Comment} */ (node).data);
					continue;
				}
				if (node.nodeType !== Node.ELEMENT_NODE) continue;
				const element = /** @type {Element} */ (node);
				facets.elements.push(shapeOf(element, depth));
				// SVG carries `<style>` and `<script>` too, and an engine reads both
				// the same way — so their bodies are data there as well, not the page
				// text a minified stylesheet would look like a change to.
				const local = element.localName;
				const name =
					element.namespaceURI === NS_HTML ||
					(element.namespaceURI === NS_SVG &&
						(local === "style" || local === "script"))
						? local
						: null;
				// The text this element holds itself, so text moved to a neighbor cannot hide in
				// the document-wide concatenation. Only where it reaches the page: whitespace
				// between `<head>` children renders nothing, and a `<style>` body is data.
				const inPage = renders || name === "body";
				if (inPage && name !== "style" && name !== "script") {
					facets.ownText.push(
						[...element.childNodes]
							.filter((child) => child.nodeType === Node.TEXT_NODE)
							.map((child) => child.nodeValue || "")
							.join("")
					);
				}
				const text = element.textContent || "";
				if (name === "style") {
					styles.push(text);
				} else if (name === "script") {
					const type = (element.getAttribute("type") || "").toLowerCase();
					let body = text;
					// An import map and speculation rules are JSON too, though the type
					// does not say so.
					if (
						type.endsWith("json") ||
						type === "importmap" ||
						type === "speculationrules"
					) {
						try {
							body = JSON.stringify(JSON.parse(text));
						} catch (_err) {
							/* not JSON after all — compare it as written */
						}
					}
					facets.scripts.push(`${type}:${body}`);
				} else if (name === "template") {
					const content = /** @type {HTMLTemplateElement} */ (element).content;
					facets.templates.push(renderedTextOf(content));
					collect(content, depth + 1, true);
				}
				// An open shadow root renders and is script-reachable, so it is held
				// to the same standard as the light tree. A closed one is reachable
				// from neither, and the round-trip case compares it as a template.
				if (element.shadowRoot !== null) {
					facets.shadows.push(renderedTextOf(element.shadowRoot));
					collect(element.shadowRoot, depth + 1, inPage);
				}
				collect(element, depth + 1, inPage);
			}
		};
		collect(doc, 0, false);
		// `shadowRoot` never hands back a closed root, so its content is read off
		// a second, inert parse — where it is still the `<template>` it was
		// written as. Without this, attaching the root hides what is inside it.
		if (attached !== null) {
			const inert = new DOMParser().parseFromString(html, "text/html");
			for (const closed of inert.querySelectorAll(
				'template[shadowrootmode="closed" i]'
			)) {
				const content = /** @type {HTMLTemplateElement} */ (closed).content;
				facets.shadows.push(renderedTextOf(content));
				collect(content, 0, true);
			}
		}
		const doctype = doc.doctype;
		// WHY: Quirks mode changes layout, so a doctype has to survive as one —
		// but `compatMode` is a function of the doctype alone, so with none it
		// reports what the engine defaults a parsed document to rather than
		// anything the printer wrote, and WebKit answers that unlike Blink.
		facets.document =
			doctype === null
				? ["no doctype"]
				: [
						`${doctype.name}|${doctype.publicId}|${doctype.systemId}`,
						doc.compatMode
					];
		// What the page renders: the title, whose getter strips and collapses ASCII
		// whitespace as the spec says a title is read, and the body's text. A `<script>`
		// or `<style>` body is data, and a `<template>`'s content does not render.
		facets.text = [
			doc.title,
			doc.body === null ? "" : renderedTextOf(doc.body)
		];
		return { facets, styles };
	};

	/**
	 * The IDL member an attribute reflects, and what it reads back. Probed on an
	 * element the spec defines the attribute for, so a scoped one is read where
	 * it means something rather than skipped as unknown.
	 * @param {string} tagName the element to probe on
	 * @param {string} attribute the attribute name
	 * @param {string | null} value the value to set, or null to leave it absent
	 * @returns {[string | undefined, unknown]} the IDL member and its value
	 */
	const probeReflection = (tagName, attribute, value) => {
		const node = document.createElement(tagName);
		if (value !== null) node.setAttribute(attribute, value);
		document.body.append(node);
		const property = reflectionOf(node, attribute);
		const reflected =
			property === undefined
				? undefined
				: /** @type {Record<string, unknown>} */ (
						/** @type {unknown} */ (node)
					)[property];
		node.remove();
		return [property, reflected];
	};

	/**
	 * Every data URL's payload decoded, as `decodeDataUrls` does outside the page:
	 * the URL parser decodes `%3D` and `=` to one byte before anything reads it.
	 * @param {string} text a value
	 * @returns {string} it, each data URL's payload decoded
	 */
	const decodeDataUrls = (text) =>
		text.replace(
			/url\("(data:[^,"]*,)((?:[^"\\]|\\.)*)"\)/gi,
			(whole, metadata, payload) => {
				try {
					return `url("${metadata}${decodeURIComponent(payload)}")`;
				} catch (_err) {
					return whole;
				}
			}
		);

	/**
	 * A value an element computes, in the one spelling rules are compared in: a
	 * custom property as its token stream, anything else named once, its colors
	 * painted and its data URLs decoded.
	 * @param {string} property the property
	 * @param {string} value its computed value
	 * @returns {string} the value, spelled once
	 */
	const cascadeValue = (property, value) => {
		if (property.startsWith("--")) return decodeDataUrls(normalizeValue(value));
		const named = canonical(
			property === "font-family" || property === "font"
				? unquoteFamilies(value)
				: value
		);
		const whole = painted(named);
		return decodeDataUrls(whole === named ? paintedColors(named) : whole);
	};

	/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window)).__eq =
		{
			htmlFacets,
			probeReflection,
			canonical,
			paintedColors,
			normalizeValue,
			cascadeValue
		};
};

// One number wherever it stands in a value.
const NUMBER_RUN = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;

// The printer rounds to six significant digits, so anything derived from one lands
// within a relative 1e-5 of the unrounded input. That is under Chromium's own
// 1/64px layout grid at every length a stylesheet uses, which is the bound.
const NUMERIC_TOLERANCE = 1e-5;

/**
 * Whether two values differ only in numbers the printer's own rounding could
 * have moved. Everything that is not a number has to match exactly, and the
 * numbers have to line up one for one — a value with more of them is a
 * different value however close each one reads.
 * @param {string} one a value
 * @param {string} other another
 * @returns {boolean} whether they say the same thing
 */
const numericallyEqual = (one, other) => {
	if (one === other) return true;
	const mine = one.split(NUMBER_RUN);
	const theirs = other.split(NUMBER_RUN);
	if (mine.length !== theirs.length) return false;
	for (let at = 0; at < mine.length; at++) {
		if (mine[at] !== theirs[at]) return false;
	}
	const oneNumbers = one.match(NUMBER_RUN) || [];
	const otherNumbers = other.match(NUMBER_RUN) || [];
	for (let at = 0; at < oneNumbers.length; at++) {
		const a = Number(oneNumbers[at]);
		const b = Number(otherNumbers[at]);
		if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
		// The rounding this tolerance stands for never moves a number it writes
		// back as an integer, so a pair of those has to match exactly.
		if (Number.isInteger(a) && Number.isInteger(b)) {
			if (a !== b) return false;
			continue;
		}
		const scale = Math.max(Math.abs(a), Math.abs(b), 1);
		if (Math.abs(a - b) > scale * NUMERIC_TOLERANCE) return false;
	}
	return true;
};

/**
 * One page printed two ways that must render alike.
 * @typedef {{ name: string, before: string, after: string }} RenderPair
 */

/**
 * What one pair rendered differently, and how many elements were compared.
 * @typedef {{ name: string, elements: number, differences: string[] }} RenderReport
 */

/**
 * Runs in the page (after `installHelpers`): renders both documents of each pair
 * at one width in a sandboxed frame, comparing every element's boxes and what its
 * `style` attribute computes, and the text a reader sees.
 * @param {{ pairs: RenderPair[], width: number }} input the pairs, and the frame's width
 * @returns {Promise<RenderReport[]>} one report per pair, in order
 */
const compareRenders = async ({ pairs, width }) => {
	const REPORTED = 5;
	// Under Chromium's 1/64px layout grid, where the same line laid out from
	// text split differently can land.
	const TOLERANCE = 0.05;
	const frame = document.createElement("iframe");
	frame.setAttribute("sandbox", "allow-same-origin");
	frame.style.cssText = `width:${width}px;height:800px;border:0`;
	document.body.append(frame);

	/**
	 * @param {string} html a document
	 * @returns {Promise<void>} once the frame has loaded it
	 */
	const render = (html) =>
		new Promise((resolve) => {
			frame.addEventListener("load", () => resolve(), { once: true });
			frame.srcdoc = html;
		});

	/**
	 * @param {Element} element an element
	 * @returns {string} where it stands, closest ancestors last
	 */
	const whereIs = (element) => {
		/** @type {string[]} */
		const path = [];
		for (
			let current = /** @type {Element | null} */ (element);
			current !== null && path.length < 4;
			current = current.parentElement
		) {
			const classes = current.getAttribute("class");
			path.unshift(
				`${current.localName}${current.id ? `#${current.id}` : ""}${
					classes ? `.${classes.trim().split(/\s+/).join(".")}` : ""
				}`
			);
		}
		return path.join(" > ");
	};

	/**
	 * The boxes an element's fragments take, those touching on one line joined:
	 * a text node split by a comment the printer drops ends a fragment there.
	 * @param {Element} element an element
	 * @returns {number[][]} its boxes as `[x, y, width, height]`
	 */
	const boxesOf = (element) => {
		/** @type {number[][]} */
		const out = [];
		for (const box of element.getClientRects()) {
			const last = out[out.length - 1];
			if (
				last !== undefined &&
				last[1] === box.y &&
				last[3] === box.height &&
				Math.abs(last[0] + last[2] - box.x) < TOLERANCE
			) {
				last[2] = box.x + box.width - last[0];
			} else {
				out.push([box.x, box.y, box.width, box.height]);
			}
		}
		return out;
	};

	/**
	 * @param {number[][]} one boxes
	 * @param {number[][]} other boxes
	 * @returns {boolean} whether they stand in the same place, to within the tolerance
	 */
	const sameBoxes = (one, other) =>
		one.length === other.length &&
		one.every((box, at) =>
			box.every((edge, side) => Math.abs(edge - other[at][side]) < TOLERANCE)
		);

	/**
	 * @param {number[][]} boxes boxes
	 * @returns {string} them, readable
	 */
	const showBoxes = (boxes) =>
		boxes.length === 0
			? "no box"
			: boxes
					.map(
						([x, y, boxWidth, height]) =>
							`${x.toFixed(2)},${y.toFixed(2)} ${boxWidth.toFixed(2)}x${height.toFixed(2)}`
					)
					.join(" ");

	/**
	 * What a `style` attribute does: every longhand it sets, as the element computes it.
	 * @param {Element} element an element
	 * @returns {string} its declared properties and their computed values
	 */
	const styledBy = (element) => {
		const own = /** @type {HTMLElement} */ (element).style;
		if (own === undefined || own.length === 0) return "";
		const view = /** @type {Window} */ (element.ownerDocument.defaultView);
		const style = view.getComputedStyle(element);
		/** @type {string[]} */
		const out = [];
		for (let at = 0; at < own.length; at++) out.push(own.item(at));
		return out
			.sort()
			.map(
				(name) =>
					`${name}:${
						/** @type {{ __eq: PageHelpers }} */ (
							/** @type {unknown} */ (window)
						).__eq.cascadeValue(name, style.getPropertyValue(name))
					}`
			)
			.join(";");
	};

	/**
	 * @returns {Promise<{ tags: string[], where: string[], boxes: number[][][], styled: string[], text: string, title: string, size: string }>} what the frame renders
	 */
	const measure = async () => {
		const doc = /** @type {Document} */ (frame.contentDocument);
		await doc.fonts.ready;
		// A transition or animation would be read part way through.
		for (const running of doc.getAnimations()) running.cancel();
		const root = /** @type {HTMLElement} */ (doc.documentElement);
		const elements = [...doc.querySelectorAll("*")];
		return {
			tags: elements.map((element) => element.localName),
			where: elements.map(whereIs),
			// What a `<marquee>` holds moves as it scrolls, whenever it is read.
			boxes: elements.map((element) =>
				element.closest("marquee") === null ? boxesOf(element) : []
			),
			styled: elements.map(styledBy),
			text: root.innerText,
			title: doc.title,
			size: `${root.scrollWidth}x${root.scrollHeight}`
		};
	};

	/** @type {RenderReport[]} */
	const reports = [];
	for (const pair of pairs) {
		await render(pair.before);
		const before = await measure();
		await render(pair.after);
		const after = await measure();
		/** @type {string[]} */
		const differences = [];
		if (before.title !== after.title) {
			differences.push(`title: ${before.title} -> ${after.title}`);
		}
		if (before.text !== after.text) {
			let at = 0;
			while (before.text[at] === after.text[at]) at++;
			const from = Math.max(0, at - 30);
			differences.push(
				`text at ${at}: ${JSON.stringify(
					before.text.slice(from, at + 30)
				)} -> ${JSON.stringify(after.text.slice(from, at + 30))}`
			);
		}
		if (before.tags.join(" ") !== after.tags.join(" ")) {
			differences.push(
				`elements: ${before.tags.length} -> ${after.tags.length}`
			);
		} else {
			for (
				let at = 0;
				at < before.boxes.length && differences.length < REPORTED;
				at++
			) {
				if (before.styled[at] !== after.styled[at]) {
					differences.push(
						`${before.where[at]}: style ${before.styled[at]} -> ${after.styled[at]}`
					);
				} else if (!sameBoxes(before.boxes[at], after.boxes[at])) {
					differences.push(
						`${before.where[at]}: ${showBoxes(before.boxes[at])} -> ${showBoxes(
							after.boxes[at]
						)}`
					);
				}
			}
		}
		if (differences.length === 0 && before.size !== after.size) {
			differences.push(`size: ${before.size} -> ${after.size}`);
		}
		reports.push({
			name: pair.name,
			elements: before.tags.length,
			differences
		});
	}
	frame.remove();
	return reports;
};

/**
 * One stylesheet printed two ways that must style every element alike.
 * @typedef {{ name: string, before: string, after: string }} StylePair
 */

/**
 * One element or pseudo-element a pair styles differently: where it stands and
 * under which sample, and per property the two values as computed and as spelled once.
 * @typedef {{ at: string, moved: [string, string, string, string, string][] }} StyleDifference
 */

/**
 * What one pair styled differently, and how much was compared.
 * @typedef {{ name: string, elements: number, properties: number, samples: number, differences: StyleDifference[] }} StyleReport
 */

/**
 * Runs in the page: builds the elements each pair's selectors reach, one set
 * in each of two frames, adopts one sheet per frame, and compares every element's
 * computed style at each viewport and container size a query of either sheet
 * names. What no element can show — a font face, a counter style — is compared as
 * the engine serializes it.
 * @param {{ pairs: StylePair[], types: string[] }} input the pairs, and element types every pair nests in each other
 * @returns {Promise<StyleReport[]>} one report per pair, in order
 */
const compareStyles = async ({ pairs, types }) => {
	// Enough to leave several once rounding is set aside outside the page.
	const KEPT = 200;
	// Each breakpoint builds and reads its elements again, so a sheet naming many is
	// sampled at the first ones.
	const MAX_SAMPLES = 48;
	const DOCUMENT_ELEMENTS = new Set(["html", "head", "body"]);
	// WHY: a state only input puts an element in would leave its rules applying in
	// neither frame, so a printer's defect there would compare equal. Both sheets
	// read each as an attribute instead — rewritten in what the engine serialized,
	// so the two spellings of one selector are rewritten alike.
	const STATES =
		/(^|[^:\\]):(hover|active|focus|focus-visible|focus-within|visited|link|any-link|local-link|target|target-within|checked|indeterminate|default|disabled|enabled|required|optional|valid|invalid|user-valid|user-invalid|in-range|out-of-range|placeholder-shown|autofill|-webkit-autofill|read-only|read-write|open|closed|popover-open|modal|fullscreen|picture-in-picture|playing|paused|seeking|buffering|stalled|muted|volume-locked|current|past|future|blank|defined)(?![\w-])/gi;
	// The pseudo-elements `getComputedStyle` reads, beyond the two every element has.
	const PSEUDOS =
		/::(marker|placeholder|first-line|first-letter|selection|backdrop|file-selector-button)(?![\w-])/gi;
	// What a keyframe says besides its properties, which `offset` is one of too.
	const KEYFRAME_FIELDS = new Set(["offset", "easing", "composite"]);
	// What `content` computes to on a pseudo-element that renders nothing.
	const NO_CONTENT = /^(?:none|normal)$/;
	const { cascadeValue, normalizeValue } =
		/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window)).__eq;

	/**
	 * @param {string} text an identifier as the CSSOM serializes it
	 * @returns {string} the name it spells
	 */
	const unescapeIdentifier = (text) =>
		text.replace(/\\(?:([0-9a-fA-F]{1,6}) ?|([\s\S]))/g, (_, hex, other) =>
			hex === undefined ? other : String.fromCodePoint(Number.parseInt(hex, 16))
		);

	/**
	 * @param {string} list a selector list
	 * @returns {string[]} its selectors
	 */
	const splitList = (list) => {
		/** @type {string[]} */
		const out = [];
		let depth = 0;
		let quote = "";
		let start = 0;
		for (let i = 0; i < list.length; i++) {
			const char = list[i];
			if (char === "\\") {
				i++;
			} else if (quote !== "") {
				if (char === quote) quote = "";
			} else if (char === '"' || char === "'") {
				quote = char;
			} else if (char === "(" || char === "[") {
				depth++;
			} else if (char === ")" || char === "]") {
				depth--;
			} else if (char === "," && depth === 0) {
				out.push(list.slice(start, i).trim());
				start = i + 1;
			}
		}
		out.push(list.slice(start).trim());
		return out;
	};

	/** @typedef {{ combinator: string, type: string, classes: string[], id: string, attributes: [string, string][] }} Compound */

	/**
	 * A selector as the compounds an element chain has to carry. A pseudo-class is
	 * left out, and so is what it holds — but the first selector of an `:is()` or
	 * `:where()` is taken in, since the element has to be one of those.
	 * @param {string} selector one selector
	 * @returns {Compound[] | null} the chain, or null for a shape not read here
	 */
	const parseSelector = (selector) => {
		const IDENTIFIER =
			/^(?:[-\w\u00A0-\uFFFF]|\\(?:[0-9a-fA-F]{1,6} ?|[\s\S]))+/;
		const ATTRIBUTE =
			/^\[\s*([-\w]+)\s*(?:[~|^$*]?=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s\]]+)\s*[iIsS]?\s*)?\]/;
		/**
		 * @param {string} combinator how it joins the compound before it
		 * @returns {Compound} an empty compound
		 */
		const fresh = (combinator) => ({
			combinator,
			type: "",
			classes: [],
			id: "",
			attributes: []
		});
		/** @type {Compound[]} */
		const chain = [];
		let current = fresh("");
		let started = false;
		let at = 0;
		while (at < selector.length) {
			const rest = selector.slice(at);
			const combinator = /^[\s>+~]+/.exec(rest);
			if (combinator !== null) {
				if (started) {
					chain.push(current);
					const named = combinator[0].replace(/\s/g, "");
					current = fresh(named === "" ? " " : named);
					started = false;
				}
				at += combinator[0].length;
				continue;
			}
			started = true;
			const char = rest[0];
			if (char === "*") {
				at++;
			} else if (char === "." || char === "#") {
				const name = IDENTIFIER.exec(rest.slice(1));
				if (name === null) return null;
				if (char === ".") current.classes.push(unescapeIdentifier(name[0]));
				else current.id = unescapeIdentifier(name[0]);
				at += 1 + name[0].length;
			} else if (char === "[") {
				const attribute = ATTRIBUTE.exec(rest);
				if (attribute === null) return null;
				const value = attribute[2] === undefined ? "" : attribute[2];
				current.attributes.push([
					attribute[1],
					unescapeIdentifier(/^["']/.test(value) ? value.slice(1, -1) : value)
				]);
				at += attribute[0].length;
			} else if (char === ":") {
				const name = /^::?[-\w]+/.exec(rest);
				if (name === null) return null;
				at += name[0].length;
				if (selector[at] === "(") {
					const open = at;
					for (let depth = 0; at < selector.length; at++) {
						if (selector[at] === "(") depth++;
						else if (selector[at] === ")" && --depth === 0) break;
					}
					at++;
					if (/^:(?:is|where)$/i.test(name[0])) {
						const [first] = splitList(selector.slice(open + 1, at - 1));
						const inner = parseSelector(first);
						// One compound only: a chain inside cannot stand in this one's place.
						if (inner !== null && inner.length === 1) {
							const [one] = inner;
							if (one.type !== "") current.type = one.type;
							if (one.id !== "") current.id = one.id;
							current.classes.push(...one.classes);
							current.attributes.push(...one.attributes);
						}
					}
				}
			} else {
				const name = IDENTIFIER.exec(rest);
				// A namespace or a nesting selector: the chain would not say what it matches.
				if (name === null) return null;
				current.type = unescapeIdentifier(name[0]).toLowerCase();
				at += name[0].length;
			}
		}
		chain.push(current);
		return chain;
	};

	/**
	 * @param {Document} doc the document to build in
	 * @param {Compound} compound what the element carries
	 * @returns {Element} the element
	 */
	const build = (doc, compound) => {
		/** @type {Element} */
		let element;
		try {
			element = doc.createElement(compound.type || "div");
		} catch (_err) {
			element = doc.createElement("div");
		}
		if (compound.classes.length > 0) {
			element.setAttribute("class", compound.classes.join(" "));
		}
		if (compound.id !== "") element.id = compound.id;
		for (const [name, value] of compound.attributes) {
			try {
				element.setAttribute(name, value);
			} catch (_err) {
				// A name the DOM will not take is one no element carries either.
			}
		}
		return element;
	};

	/**
	 * @returns {Promise<HTMLIFrameElement>} a frame holding an empty standards-mode document
	 */
	const openFrame = () =>
		new Promise((resolve) => {
			const frame = document.createElement("iframe");
			frame.style.cssText = "border:0;display:block;width:1400px;height:800px";
			frame.addEventListener("load", () => resolve(frame), { once: true });
			frame.srcdoc = "<!doctype html><html><head></head><body></body></html>";
			document.body.append(frame);
		});

	/**
	 * @param {Window} win a frame's window
	 * @returns {Promise<void>} once it has rendered twice
	 */
	const settle = (win) =>
		new Promise((resolve) => {
			win.requestAnimationFrame(() =>
				win.requestAnimationFrame(() => resolve())
			);
		});

	const LENGTH = /-?\d*\.?\d+(?:e[+-]?\d+)?px/gi;
	const NUMBER = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;

	/**
	 * @param {string} one a value
	 * @param {string} other another
	 * @returns {boolean} whether they differ in pixel lengths alone
	 */
	const sameButLengths = (one, other) =>
		one.replace(LENGTH, "px") === other.replace(LENGTH, "px");

	/**
	 * @param {string} one a value
	 * @param {string} other another
	 * @returns {boolean} whether they differ past the printer's six digits nowhere
	 */
	const numericallyAlike = (one, other) => {
		if (one.replace(NUMBER, "0") !== other.replace(NUMBER, "0")) return false;
		const theirs = other.match(NUMBER) || [];
		return (one.match(NUMBER) || []).every((number, at) => {
			const [a, b] = [Number(number), Number(theirs[at])];
			return Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b), 1) * 1e-5;
		});
	};

	/**
	 * Every animation a document runs, by element, spelled as its name and keyframes,
	 * then cancelled. Taken document-wide, since each cancel invalidates the style a
	 * per-element read would recompute.
	 * @param {Document} doc the document
	 * @returns {Map<Element, string>} per element, its animations
	 */
	const takeAnimations = (doc) => {
		/** @type {Map<Element, string>} */
		const out = new Map();
		const running = doc.getAnimations();
		for (const animation of running) {
			const effect = /** @type {KeyframeEffect} */ (animation.effect);
			if (effect === null || effect.target === null) continue;
			const described = `${effect.pseudoElement || ""}${
				/** @type {EXPECTED_ANY} */ (animation).animationName
			}:${effect
				.getKeyframes()
				.map((frame) =>
					Object.keys(frame)
						.filter((key) => key !== "computedOffset")
						.sort()
						.map(
							(key) =>
								`${key}=${
									KEYFRAME_FIELDS.has(key)
										? normalizeValue(String(frame[key]))
										: computedAs(key, String(frame[key]))
								}`
						)
						.join(";")
				)
				.join("|")}`;
			const earlier = out.get(effect.target);
			out.set(
				effect.target,
				earlier === undefined ? described : `${earlier} ${described}`
			);
		}
		for (const animation of running) animation.cancel();
		return out;
	};

	/**
	 * The lengths a condition names, in pixels, by the dimension each is of.
	 * @param {string} condition a media or container condition
	 * @returns {{ width: number[], height: number[] }} its lengths
	 */
	const lengthsIn = (condition) => {
		/** @type {{ width: number[], height: number[] }} */
		const out = { width: [], height: [] };
		for (const [, feature, rest] of condition.matchAll(
			/\(([^():]*?)(?:[:<>=]+)([^()]*)\)/g
		)) {
			const dimension = /height|block-size/.test(feature) ? "height" : "width";
			for (const [, number, unit] of `${feature} ${rest}`.matchAll(
				/(\d*\.?\d+)(px|r?em)\b/gi
			)) {
				const size = Number(number) * (unit.toLowerCase() === "px" ? 1 : 16);
				if (size > 0 && size < 10000) out[dimension].push(Math.round(size));
			}
		}
		return out;
	};

	const probe = document.createElement("div");
	document.body.append(probe);

	/**
	 * A declaration no element computes as it stands, read as the property it is
	 * where the engine takes it as one: `font-weight: normal` is `400` either way.
	 * @param {string} name the property or descriptor
	 * @param {string} value its value as written
	 * @returns {string} the value, spelled once
	 */
	const computedAs = (name, value) => {
		probe.style.cssText = "";
		probe.style.setProperty(name, value);
		return probe.style.getPropertyValue(name) === ""
			? normalizeValue(value)
			: cascadeValue(name, getComputedStyle(probe).getPropertyValue(name));
	};

	/**
	 * @param {CSSStyleDeclaration} style a block no element computes
	 * @returns {string} its declarations, spelled once
	 */
	const described = (style) => {
		/** @type {string[]} */
		const out = [];
		for (let i = 0; i < style.length; i++) {
			const name = style.item(i);
			out.push(`${name}:${computedAs(name, style.getPropertyValue(name))}`);
		}
		return `{${out.join(";")}}`;
	};

	/**
	 * @typedef {object} SheetReading
	 * @property {Map<string, string[]>} sequences per property, every declaration of it in cascade order
	 * @property {Map<string, Set<string>>} selectors per property, every selector a rule declaring it applies under, nesting resolved
	 * @property {Map<string, Set<string>>} atLength per `<dimension><px>` a query names, the selectors of the rules under it
	 * @property {Set<string>} conditioned every property a rule under a media or container query declares
	 * @property {Map<string, Set<string>>} reads per custom property, the properties that substitute it
	 * @property {string[]} layers every layer in the order the cascade ranks them, which is where each is first named
	 * @property {Set<string>} containerNames every container a query names
	 * @property {boolean} queried whether any container query is written
	 * @property {string[]} described what no element shows, as the engine serializes it
	 * @property {string[]} keyframes every keyframes rule, as the engine serializes it
	 * @property {Map<string, string>} unobserved per selector and property under `@starting-style`, the declaration that wins
	 */

	/**
	 * Every rule of a sheet, each state it names rewritten into an attribute.
	 * @param {CSSStyleSheet} sheet the sheet, adopted
	 * @returns {SheetReading} what the comparison needs of it
	 */
	const readSheet = (sheet) => {
		/** @type {SheetReading} */
		const out = {
			sequences: new Map(),
			selectors: new Map(),
			atLength: new Map(),
			conditioned: new Set(),
			reads: new Map(),
			layers: [],
			containerNames: new Set(),
			queried: false,
			described: [],
			keyframes: [],
			unobserved: new Map()
		};
		/**
		 * @template T
		 * @param {Map<string, Set<T>>} map the map
		 * @param {string} key where to add
		 * @param {Iterable<T>} values what to add
		 */
		const addAll = (map, key, values) => {
			const set = map.get(key);
			if (set === undefined) map.set(key, new Set(values));
			else for (const value of values) set.add(value);
		};
		/**
		 * @param {CSSRuleList} rules the rules
		 * @param {string} context the conditions around them
		 * @param {string[] | null} parents the selectors of the style rule they nest in
		 * @param {string} scope the scope root's selector, or ""
		 * @param {string[]} lengths the `<dimension><px>` keys the queries around them name
		 */
		const walk = (rules, context, parents, scope, lengths) => {
			for (const rule of rules) {
				const kind = rule.constructor.name;
				const any = /** @type {EXPECTED_ANY} */ (rule);
				if (kind === "CSSStyleRule" || kind === "CSSNestedDeclarations") {
					let own = parents || [""];
					if (kind === "CSSStyleRule") {
						const mapped = any.selectorText.replace(STATES, "$1[data-eq-$2]");
						if (mapped !== any.selectorText) any.selectorText = mapped;
						own = [];
						for (const one of splitList(any.selectorText)) {
							for (const parent of parents || [scope]) {
								if (parent === "") {
									own.push(one.replace(/:scope|&/g, "").trim() || "*");
								} else if (/&|:scope/.test(one)) {
									own.push(one.replace(/&|:scope/g, parent));
								} else {
									own.push(`${parent} ${one}`);
								}
							}
						}
					}
					for (const key of lengths) addAll(out.atLength, key, own);
					const style = /** @type {CSSStyleDeclaration} */ (any.style);
					const where = `${context}\u0001${
						kind === "CSSStyleRule" ? any.selectorText : "&"
					}`;
					// A shorthand holding a `var()` leaves each longhand empty until it is
					// substituted, so what the rule says there is its whole text.
					const text = style.cssText;
					const substitutes = [...text.matchAll(/var\(\s*(--[\w-]+)/g)].map(
						([, name]) => name
					);
					for (let i = 0; i < style.length; i++) {
						const property = style.item(i);
						const entry = `${where}\u0001${
							style.getPropertyValue(property) || text
						}\u0001${style.getPropertyPriority(property)}`;
						const sequence = out.sequences.get(property);
						if (sequence === undefined) out.sequences.set(property, [entry]);
						else sequence.push(entry);
						addAll(out.selectors, property, own);
						if (lengths.length > 0) out.conditioned.add(property);
						for (const name of substitutes) addAll(out.reads, name, [property]);
					}
					if (any.cssRules !== undefined) {
						walk(any.cssRules, where, own, scope, lengths);
					}
				} else if (kind === "CSSMediaRule" || kind === "CSSContainerRule") {
					const condition =
						kind === "CSSMediaRule" ? any.media.mediaText : any.containerQuery;
					if (kind === "CSSContainerRule") {
						out.queried = true;
						if (any.containerName) out.containerNames.add(any.containerName);
					}
					const named = lengthsIn(condition);
					const prefix = kind === "CSSMediaRule" ? "" : "box";
					walk(
						any.cssRules,
						`${context}@${kind === "CSSMediaRule" ? "media" : `container ${any.containerName}`} ${condition}`,
						parents,
						scope,
						[
							...lengths,
							...named.width.map((px) => `${prefix}width${px}`),
							...named.height.map((px) => `${prefix}height${px}`),
							// A query naming no length still holds at some sizes and not others.
							`${prefix}any`
						]
					);
				} else if (kind === "CSSSupportsRule") {
					walk(
						any.cssRules,
						`${context}@supports ${any.conditionText}`,
						parents,
						scope,
						lengths
					);
				} else if (kind === "CSSLayerBlockRule") {
					const name = `${context}@layer ${any.name}`;
					if (!out.layers.includes(name)) out.layers.push(name);
					walk(any.cssRules, name, parents, scope, lengths);
				} else if (kind === "CSSLayerStatementRule") {
					for (const one of any.nameList) {
						const name = `${context}@layer ${one}`;
						if (!out.layers.includes(name)) out.layers.push(name);
					}
				} else if (kind === "CSSScopeRule") {
					walk(
						any.cssRules,
						`${context}@scope ${any.start}`,
						parents,
						any.start || "",
						lengths
					);
				} else if (kind === "CSSKeyframesRule") {
					out.keyframes.push(`${context}${normalizeValue(rule.cssText)}`);
				} else if (kind === "CSSStartingStyleRule") {
					// What no element computes until it transitions, read per selector and
					// property since a printer may join or merge the blocks declaring it.
					const flat = (
						/** @type {CSSRuleList} */ list,
						/** @type {string} */ where
					) => {
						for (const inner of list) {
							const held = /** @type {EXPECTED_ANY} */ (inner);
							if (held.selectorText === undefined) {
								if (held.cssRules !== undefined) {
									flat(
										held.cssRules,
										`${where}${held.cssText.slice(0, held.cssText.indexOf("{"))}`
									);
								}
								continue;
							}
							const style = /** @type {CSSStyleDeclaration} */ (held.style);
							for (const selector of splitList(held.selectorText)) {
								for (let i = 0; i < style.length; i++) {
									const name = style.item(i);
									const key = `${where}${selector} ${name}`;
									// CSS Cascade 4 §6.2: a later normal declaration loses to an important one.
									const important = style.getPropertyPriority(name) !== "";
									if (
										!important &&
										(out.unobserved.get(key) || "").endsWith("!")
									) {
										continue;
									}
									out.unobserved.set(
										key,
										`${computedAs(name, style.getPropertyValue(name))}${important ? "!" : ""}`
									);
								}
							}
						}
					};
					flat(any.cssRules, `${context}@starting-style `);
				} else if (kind !== "CSSImportRule") {
					// A font face, a counter style, a page or a registered property. An
					// adopted sheet holds no import.
					const text = rule.cssText;
					out.described.push(
						`${context}${
							any.style === undefined
								? normalizeValue(text)
								: `${text.slice(0, text.indexOf("{")).trim()}${described(any.style)}`
						}`
					);
				}
			}
		};
		walk(sheet.cssRules, "", null, "", []);
		return out;
	};

	/** @type {StyleReport[]} */
	const reports = [];
	const frames = [await openFrame(), await openFrame()];
	const windows = frames.map(
		(frame) => /** @type {Window & typeof globalThis} */ (frame.contentWindow)
	);
	const docs = frames.map(
		(frame) => /** @type {Document} */ (frame.contentDocument)
	);
	for (const pair of pairs) {
		const readings = [pair.before, pair.after].map((text, at) => {
			const sheet = new windows[at].CSSStyleSheet();
			sheet.replaceSync(text);
			docs[at].adoptedStyleSheets = [sheet];
			return readSheet(sheet);
		});
		const [one, other] = readings;
		/** @type {StyleDifference[]} */
		const moved = [];
		const unobserved = [one, other].map((reading) =>
			[...reading.unobserved].sort().join("\n")
		);
		if (unobserved[0] !== unobserved[1]) {
			moved.push({
				at: "rules under @starting-style",
				moved: [
					["", unobserved[0], unobserved[1], unobserved[0], unobserved[1]]
				]
			});
		}
		if (one.described.join("\n") !== other.described.join("\n")) {
			const at = one.described.findIndex(
				(text, i) => text !== other.described[i]
			);
			const [a, b] = [String(one.described[at]), String(other.described[at])];
			moved.push({
				at: "rules no element computes",
				moved: [["", a, b, a, b]]
			});
		}

		// A property is read wherever the two sheets declare it apart — a value, a
		// selector, a condition or an order — or rank the layers it sits in apart,
		// and so is one reading a custom property that is.
		/** @type {Set<string>} */
		const tracked = new Set();
		const layered = one.layers.join("\u0002") !== other.layers.join("\u0002");
		for (const property of new Set([
			...one.sequences.keys(),
			...other.sequences.keys()
		])) {
			const a = one.sequences.get(property) || [];
			const b = other.sequences.get(property) || [];
			if (layered || a.join("\u0002") !== b.join("\u0002")) {
				tracked.add(property);
			}
		}
		// A keyframe shows in the animations an element runs, which it runs by name.
		if (one.keyframes.join("\u0002") !== other.keyframes.join("\u0002")) {
			tracked.add("animation-name");
		}
		for (const property of tracked) {
			if (!property.startsWith("--")) continue;
			for (const reading of readings) {
				for (const reader of reading.reads.get(property) || []) {
					tracked.add(reader);
				}
			}
		}
		const properties = [...tracked];
		const conditioned = properties.filter(
			(name) => one.conditioned.has(name) || other.conditioned.has(name)
		);

		// Each chain a selector of a rule declaring a read property needs, and per
		// selector what those rules declare.
		/** @type {Map<string, Compound[]>} */
		const chains = new Map();
		/** @type {Map<string, string[]>} */
		const declaredBy = new Map();
		/** @type {Set<string>} */
		const pseudos = new Set(["", "::before", "::after"]);
		for (const property of properties) {
			for (const reading of readings) {
				for (const selector of reading.selectors.get(property) || []) {
					const declared = declaredBy.get(selector);
					if (declared === undefined) declaredBy.set(selector, [property]);
					else if (!declared.includes(property)) declared.push(property);
					if (chains.has(selector)) continue;
					for (const [, pseudo] of selector.matchAll(PSEUDOS)) {
						pseudos.add(`::${pseudo.toLowerCase()}`);
					}
					const chain = parseSelector(selector);
					if (chain !== null) chains.set(selector, chain);
				}
			}
		}
		const containerNames = [
			...new Set([...one.containerNames, ...other.containerNames])
		];
		const queried = one.queried || other.queried;
		// A custom property means something only where it is substituted, and that
		// property is read in its own right, so an element carrying every class
		// leaves them to the document and the rules that declare them.
		const substituted = properties.filter((name) => !name.startsWith("--"));

		/**
		 * Builds the same elements in both frames: the chain each selector needs, and
		 * each type carrying every class and attribute those name. Each stands in a box
		 * of its own, so no size read sums the layout of the rest.
		 * @param {string[]} selectors the selectors to build for
		 * @returns {{ elements: Element[][], asked: string[][], through: string[][] }} per frame what is read, and per element which properties on which pseudo-elements
		 */
		const populate = (selectors) => {
			/** @type {Set<string>} */
			const named = new Set(["div", ...types]);
			/** @type {Set<string>} */
			const classes = new Set();
			/** @type {Map<string, string>} */
			const attributes = new Map();
			for (const selector of selectors) {
				for (const compound of chains.get(selector) || []) {
					if (compound.type !== "" && !DOCUMENT_ELEMENTS.has(compound.type)) {
						named.add(compound.type);
					}
					for (const name of compound.classes) classes.add(name);
					for (const [name, value] of compound.attributes) {
						attributes.set(name, value);
					}
				}
			}
			/** @type {string[][]} */
			const asked = [properties, properties, properties];
			const every = [...pseudos];
			/** @type {string[][]} */
			const through = [every, every, every];
			const elements = docs.map((doc, at) => {
				const holder = doc.createElement("div");
				holder.id = "eq-holder";
				const root = doc.createElement("div");
				holder.append(root);
				/** @type {Element[]} */
				const list = [doc.documentElement, doc.body, root];
				/** @returns {Element} a box of its own */
				const box = () => {
					const one = doc.createElement("div");
					one.setAttribute("style", "contain:layout size;height:400px");
					root.append(one);
					return one;
				};
				for (const selector of selectors) {
					const chain = chains.get(selector);
					if (chain === undefined) continue;
					const inside = box();
					/** @type {Element | null} */
					let last = null;
					for (const compound of chain) {
						// A document has one of each, and the root already stands inside them.
						if (DOCUMENT_ELEMENTS.has(compound.type)) {
							if (last === null) continue;
							break;
						}
						const element = build(doc, compound);
						if (
							last !== null &&
							(compound.combinator === "+" || compound.combinator === "~")
						) {
							last.after(element);
						} else {
							(last === null ? inside : last).append(element);
						}
						last = element;
					}
					// The element the selector reaches; the ones on the way are reached by
					// selectors of their own.
					if (last !== null) {
						list.push(last);
						if (at === 0) {
							asked.push(declaredBy.get(selector) || []);
							// Only a pseudo-element the selector names is one it styles.
							through.push([
								"",
								...[
									...selector.matchAll(
										/::?(before|after)(?![\w-])|::([-\w]+)/gi
									)
								]
									.map(
										([, old, pseudo]) => `::${(old || pseudo).toLowerCase()}`
									)
									.filter((pseudo) => pseudos.has(pseudo))
							]);
						}
					}
				}
				const everything = {
					combinator: "",
					type: "",
					classes: [...classes],
					id: "",
					attributes: [...attributes]
				};
				for (const type of named) {
					const outer = build(doc, { ...everything, type });
					const inner = build(doc, { ...everything, type: "div" });
					outer.append(inner);
					box().append(outer);
					// The same type carrying nothing, which is what a negated state reaches.
					const bare = build(doc, {
						...everything,
						type,
						classes: [],
						attributes: []
					});
					box().append(bare);
					const pieces = [outer, inner, bare];
					for (const child of types) {
						const parent = build(doc, { ...everything, type, classes: [] });
						const plain = build(doc, {
							...everything,
							type: child,
							classes: []
						});
						const full = build(doc, { ...everything, type: child });
						parent.append(plain, full);
						box().append(parent);
						pieces.push(parent, plain, full);
					}
					list.push(...pieces);
					if (at === 0) {
						for (const _piece of pieces) {
							asked.push(substituted);
							through.push(every);
						}
					}
				}
				doc.body.append(holder);
				return list;
			});
			return { elements, asked, through };
		};

		/**
		 * Reads both frames at each sample and records what the two compute apart.
		 * @param {{ elements: Element[][], asked: string[][], through: string[][] }} built what was built
		 * @param {{ width: number, height: number, box: number }[]} samples where to read
		 * @param {Set<string> | null} only the properties these samples can move, or null for any
		 */
		const measure = async (built, samples, only) => {
			await Promise.all(windows.map(settle));
			for (const sample of samples) {
				if (moved.length >= KEPT) return;
				for (const [at, frame] of frames.entries()) {
					frame.style.width = `${sample.width}px`;
					frame.style.height = `${sample.height}px`;
					const holder = /** @type {HTMLElement} */ (
						docs[at].getElementById("eq-holder")
					);
					holder.style.cssText = queried
						? `container-type:size;container-name:${containerNames.join(" ") || "none"};width:${
								sample.box || sample.width
							}px;height:${sample.box || sample.height}px`
						: "";
				}
				const read = built.elements;
				// Layout first: an `<object>` settles what it renders as only once one runs.
				const rendered = read.map((list) =>
					list.map((element) => element.getClientRects().length !== 0)
				);
				// Cancelled before any value is read, so none is part way through one.
				const animations = read.map((list, at) => {
					const taken = takeAnimations(docs[at]);
					return list.map((element) => taken.get(element) || "");
				});
				/** @type {{ i: number, pseudo: string, at: string, changed: [string, string, string, string, string][] }[]} */
				const found = [];
				for (let i = 0; i < read[0].length && found.length < KEPT; i++) {
					// Without a box in either frame nothing shows the value, and WebKit
					// resolves such an element's style apart from the tree it stands in.
					if (!(rendered[0][i] || rendered[1][i])) continue;
					const asked =
						only === null
							? built.asked[i]
							: built.asked[i].filter((name) => only.has(name));
					for (const pseudo of built.through[i]) {
						const styles = [0, 1].map((at) =>
							windows[at].getComputedStyle(read[at][i], pseudo || null)
						);
						// Nothing renders a `::before` or `::after` with no content.
						if (
							(pseudo === "::before" || pseudo === "::after") &&
							NO_CONTENT.test(styles[0].content) &&
							NO_CONTENT.test(styles[1].content)
						) {
							continue;
						}
						/** @type {[string, string, string, string, string][]} */
						const changed = [];
						for (const name of asked) {
							const a = styles[0].getPropertyValue(name);
							const b = styles[1].getPropertyValue(name);
							if (a === b) continue;
							const x = cascadeValue(name, a);
							const y = cascadeValue(name, b);
							if (x !== y) changed.push([name, a, b, x, y]);
						}
						if (pseudo === "" && animations[0][i] !== animations[1][i]) {
							const [a, b] = [animations[0][i], animations[1][i]];
							changed.push(["@keyframes", a, b, a, b]);
						}
						if (changed.length === 0) continue;
						const element = read[0][i];
						const tag = element.outerHTML.slice(
							0,
							element.outerHTML.indexOf(">") + 1
						);
						/** @type {string[]} */
						const path = [];
						for (
							let ancestor = element.parentElement;
							ancestor !== null && ancestor.id !== "eq-holder";
							ancestor = ancestor.parentElement
						) {
							if (!ancestor.hasAttribute("style")) {
								path.unshift(ancestor.localName);
							}
						}
						found.push({
							i,
							pseudo,
							at: `${sample.width}x${sample.height}${sample.box ? ` in ${sample.box}px` : ""}: ${[
								...path,
								tag.slice(0, 160)
							].join(" > ")}${pseudo}`,
							changed
						});
					}
				}
				// WHY: a used length is floored to the layout grid, and a percentage
				// table multiplies that step — Semantic UI's `td{width:18.75%}` moved
				// 6/64px over an 11px padding printed at six digits. Layout follows from
				// computed values, so a length is read again with no box to lay out.
				const rereading = found.some(({ changed }) =>
					changed.some(([, , , x, y]) => sameButLengths(x, y))
				);
				if (rereading) {
					for (const list of read) {
						/** @type {HTMLElement} */ (list[2]).style.setProperty(
							"display",
							"none",
							"important"
						);
					}
				}
				for (const { i, pseudo, at, changed } of found) {
					const kept = rereading
						? changed.filter(([name, , , x, y]) => {
								if (!sameButLengths(x, y)) return true;
								const [a, b] = [0, 1].map((side) =>
									cascadeValue(
										name,
										windows[side]
											.getComputedStyle(read[side][i], pseudo || null)
											.getPropertyValue(name)
									)
								);
								return !numericallyAlike(a, b);
							})
						: changed;
					if (kept.length > 0 && moved.length < KEPT) {
						moved.push({ at, moved: kept });
					}
				}
				if (rereading) {
					for (const list of read) {
						/** @type {HTMLElement} */ (list[2]).style.removeProperty(
							"display"
						);
					}
				}
			}
		};

		const clear = () => {
			for (const doc of docs) {
				const holder = doc.getElementById("eq-holder");
				if (holder !== null) holder.remove();
			}
		};

		let elementCount = 0;
		let sampled = 0;
		if (properties.length > 0) {
			// Everything at two widths, then a pixel under, at and over every length a
			// query names, reading only what the rules under such a query reach.
			const whole = populate([...chains.keys()]);
			elementCount = whole.elements[0].length;
			await measure(
				whole,
				[
					{ width: 360, height: 800, box: 0 },
					{ width: 1400, height: 800, box: 0 }
				],
				null
			);
			clear();
			sampled = 2;
			const onlyConditioned = new Set(conditioned);
			/** @type {Set<string>} */
			const keys = new Set();
			for (const reading of readings) {
				for (const key of reading.atLength.keys()) keys.add(key);
			}
			for (const key of [...keys].sort()) {
				const found = /^(box)?(width|height)(\d+)$/.exec(key);
				if (found === null || conditioned.length === 0) continue;
				if (sampled + 3 > MAX_SAMPLES || moved.length >= KEPT) break;
				/** @type {Set<string>} */
				const reached = new Set();
				for (const reading of readings) {
					for (const selector of reading.atLength.get(key) || []) {
						if (chains.has(selector)) reached.add(selector);
					}
				}
				const length = Number(found[3]);
				const part = populate([...reached]);
				await measure(
					part,
					[Math.max(1, length - 1), length, length + 1].map((size) => ({
						width: found[1] === "box" || found[2] === "height" ? 1400 : size,
						height: found[1] !== "box" && found[2] === "height" ? size : 800,
						box: found[1] === "box" ? size : 0
					})),
					onlyConditioned
				);
				clear();
				sampled += 3;
			}
		}
		for (const doc of docs) doc.adoptedStyleSheets = [];
		reports.push({
			name: pair.name,
			elements: elementCount,
			properties: properties.length,
			samples: sampled,
			differences: moved
		});
	}
	for (const frame of frames) frame.remove();
	probe.remove();
	return reports;
};

/**
 * The elements a report names once the printer's own rounding is set aside,
 * one line each and a few at most.
 * @param {StyleReport} report what the page found for one pair
 * @returns {string[]} one line per element that differs
 */
const cascadeLines = (report) => {
	/** @type {string[]} */
	const out = [];
	for (const { at, moved } of report.differences) {
		const real = moved.filter(
			([, , , one, other]) => !numericallyEqual(one, other)
		);
		if (real.length === 0) continue;
		out.push(
			`${at} ${real
				.map(([property, one, other]) => `${property}: ${one} -> ${other}`)
				.join("; ")}`
		);
		if (out.length === 5) break;
	}
	return out;
};

module.exports = {
	benchmarkDocuments,
	benchmarkStylesheets,
	buildCorpus,
	cascadeLines,
	collectFixtures,
	compareRenders,
	compareStyles,
	installHelpers,
	numericallyEqual
};
