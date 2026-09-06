"use strict";

// The machinery both equivalence suites share: the helpers installed into the
// page (an engine is the only thing that can say two spellings mean the same),
// and the comparisons built on what they report. Nothing here knows which
// corpus it is reading — `configCases` and `test/wpt` go through one path, so
// an inline `<style>` is held to exactly the same standard as a `.css` file.

const fs = require("fs");
const path = require("path");
// Read from the comparison scripts, so a fixture added to one is added here.
const {
	CACHE: CSS_CACHE,
	GENERATED_FIXTURES,
	INSTALLED_FIXTURES
} = require("../../tooling/compare-css-minifiers");
const {
	APP_SHELL,
	CACHE: HTML_CACHE,
	INLINED_STYLESHEETS,
	INSTALLED_DOCUMENTS,
	inlineCssPage
} = require("../../tooling/compare-html-minifiers");

/** @typedef {{ name: string, raw: string, min: string }} Fixture */

// How many viewport sizes any one condition set is sampled at.
const MAX_SAMPLED_SIZES = 64;

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
 * The stylesheets `yarn benchmark:css-minifiers` installs and builds.
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

/**
 * The documents `yarn benchmark:html-minifiers` installs.
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
	// The installed documents carry no `<style>` and no `style=`, so the pages
	// the comparison builds are what reach the css minifier nested in the html.
	if (out.length > 0) {
		out.push({
			name: "App shell (inline critical CSS)",
			raw: APP_SHELL,
			min: minify(APP_SHELL)
		});
	}
	// The sheets these inline come from the css cache, which is the one that
	// installs them — so they stand whether or not the html cache is built.
	for (const [label, file] of INLINED_STYLESHEETS) {
		const sheet = path.join(CSS_CACHE, "node_modules", file);
		if (!fs.existsSync(sheet)) continue;
		const raw = inlineCssPage(label, fs.readFileSync(sheet, "utf8"));
		out.push({ name: label, raw, min: minify(raw) });
	}
	return out;
};

/**
 * @typedef {{ kind: string, condition: string }} Condition
 * @typedef {{ chain: Condition[], text: string, label?: string, list?: string[], block?: string }} Rule
 * @typedef {{ facets: Record<string, string[]>, styles: Rule[][] }} Facets
 */

/**
 * @typedef {object} PageHelpers
 * @property {(source: string) => Rule[] | null} cssRules the rules of a stylesheet, in cascade order
 * @property {(html: string) => Facets} htmlFacets everything a page's DOM is made of
 * @property {(conditions: string[], sizes: number[]) => string[]} containerSignatures which sizes each container query holds at
 * @property {(conditions: string[]) => string[]} supportsSignatures whether each support condition holds
 * @property {(tagName: string, attribute: string, value: string | null) => [string | undefined, unknown]} probeReflection the IDL member an attribute reflects, and its value
 * @property {(value: string) => string} canonical a value under the one name the spec gives it
 * @property {(value: string) => string} paintedColors a value with every color it holds painted
 */

/**
 * Installed once into the page. Everything both suites need lives here so an
 * inline `<style>` is held to exactly the same standard as a `.css` file.
 * @returns {void}
 */
const installHelpers = () => {
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
			// `\2d\2d two` are the one identifier — decoded here, and written back
			// escaped in a single spelling where the character it names would
			// otherwise read as punctuation.
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
				} else {
					string += ch;
				}
			} else if (ch === '"' || ch === "'") {
				quote = ch;
				string = "";
			} else if (/[\t\n\f\r ]/.test(ch)) {
				if (!out.endsWith(" ")) out += " ";
			} else {
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
		out = out.replace(/calc\([^()]*\)/g, (call) => {
			try {
				const folded = CSSNumericValue.parse(call).toString();
				// A `calc()` left holding one term is that term.
				const single = /^calc\((-?[\d.]+[a-z%]*)\)$/i.exec(folded);
				return single === null ? folded : single[1];
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
				// Nothing fuses with a comma or a block's delimiters, so the whitespace
				// beside one says only what the delimiter already does.
				.replace(/ ?([,()[\]{}*/]) ?/g, "$1")
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

	/**
	 * The engine's computed value for every property a declaration sets, so an
	 * equivalent respelling (`bold` / `700`, `300ms` / `0.3s`, `rgb(255, 0, 0)` /
	 * `red`) compares equal and an unsafe one does not. Importance rides along
	 * because it decides the cascade without moving the computed value, and a
	 * substitution is compared as parsed because `var(--a)` and `var(--b)` both
	 * compute to nothing on a probe with no ancestor to resolve them.
	 * @param {string} declaration the declaration block
	 * @param {CSSStyleDeclaration=} own the block's own declarations, when it has
	 * them: Chrome serializes an unterminated `var(--a` as `var(--a;`, which no
	 * longer re-parses, so the probe alone would lose it
	 * @returns {string[]} one entry per property it sets, unordered
	 */
	const computed = (declaration, own) => {
		probe.style.cssText = "";
		probe.style.cssText = declaration;
		// A declaration carrying `transition-*` animates the shared probe away from
		// the previous rule's value, and the computed style would be read in flight.
		for (const animation of probe.getAnimations()) animation.cancel();
		const style = getComputedStyle(probe);
		const source = own || probe.style;
		/** @type {string[]} */
		const out = [];
		// Indexed rather than iterated: a `@function` body's `result` descriptor is
		// counted and named by `item()`, but Chrome's iterator hands back nothing.
		for (let at = 0; at < source.length; at++) {
			const property = source.item(at);
			const specified = source.getPropertyValue(property);
			const bang = source.getPropertyPriority(property) === "" ? "" : "!";
			// A custom property is a token stream the engine keeps verbatim, so it is
			// compared as written too — the whitespace and comments between its
			// tokens say nothing once it is substituted.
			const written =
				property.startsWith("--") ||
				/(^|[^\w-])(?:var|env|attr)\(/.test(specified);
			// One the probe never received has no computed value to read.
			const lost = probe.style.getPropertyValue(property) === "";
			const resolved =
				written || lost
					? normalizeValue(specified)
					: style.getPropertyValue(property);
			out.push(`${property}${bang}:${painted(canonical(resolved))}`);
		}
		return out;
	};

	/**
	 * Every rule of a stylesheet in cascade order, each carrying the chain of
	 * at-rules it sits under — so a rule that moves between two `@media` blocks
	 * cannot compare equal. Order is kept because two rules of equal specificity
	 * are resolved by it. A condition is returned as written; the caller replaces
	 * it with what the engine makes of it.
	 * @param {string} source the stylesheet
	 * @returns {Rule[] | null} its rules, or null when it does not parse
	 */
	const cssRules = (source) => {
		const sheet = new CSSStyleSheet();
		try {
			sheet.replaceSync(source);
		} catch (_err) {
			return null;
		}
		/** @type {Rule[]} */
		const out = [];
		// What each selector has been told so far, under each chain of conditions.
		/** @type {Map<string, string>} */
		const carried = new Map();
		// A nested declaration block is its own interface, so it can be recognized
		// rather than guessed at from the shape of its text.
		const nestedDeclarations =
			/** @type {{ CSSNestedDeclarations?: typeof CSSRule }} */ (
				/** @type {unknown} */ (window)
			).CSSNestedDeclarations;
		/**
		 * @param {CSSRule} rule any rule
		 * @returns {string} the text before its block
		 */
		const prelude = (rule) => {
			const text = rule.cssText;
			const brace = text.indexOf("{");
			return (brace === -1 ? text : text.slice(0, brace)).trim();
		};
		// The engine folds `even` / `odd` but hands `0n+3` back as written, so each
		// An+B is read as the sequence it selects — which one it is still matters.
		const NTH_CALL = /:(nth-(?:last-)?(?:child|of-type|col))\(([^)]*)\)/gi;
		const AN_PLUS_B =
			/^\s*(?:([+-]?)\s*(\d*)[nN]\s*(?:([+-])\s*(\d+))?|([+-]?)\s*(\d+))\s*$/;
		/** @type {Record<string, string>} */
		const FIRST_LAST = {
			"nth-child": "first-child",
			"nth-last-child": "last-child",
			"nth-of-type": "first-of-type",
			"nth-last-of-type": "last-of-type"
		};
		/**
		 * @param {string} selector one selector
		 * @returns {boolean[]} which indices are inside a string or an `[…]`
		 */
		const literalMask = (selector) => {
			const mask = [];
			let quote = "";
			let brackets = 0;
			for (let i = 0; i < selector.length; i++) {
				const c = selector[i];
				mask[i] = quote !== "" || brackets > 0;
				if (c === "\\") {
					mask[++i] = true;
				} else if (quote !== "") {
					if (c === quote) quote = "";
				} else if (c === '"' || c === "'") {
					quote = c;
				} else if (c === "[") {
					brackets++;
				} else if (c === "]" && brackets > 0) {
					brackets--;
				}
			}
			return mask;
		};
		/**
		 * @param {string} selector one selector
		 * @returns {string} it, with every `An+B` written one way
		 */
		const oneSpelling = (selector) => {
			const literal = literalMask(selector);
			return selector.replace(NTH_CALL, (all, name, argument, offset) => {
				// An attribute value or a string spelling one is text, not a selector.
				if (literal[offset]) return all;
				// `An+B of S` selects among S, which this does not read.
				if (/\bof\b/i.test(argument)) return all;
				const lower = argument.trim().toLowerCase();
				const parts = AN_PLUS_B.exec(argument);
				let a;
				let b;
				if (lower === "even") {
					a = 2;
					b = 0;
				} else if (lower === "odd") {
					a = 2;
					b = 1;
				} else if (parts === null) {
					return all;
				} else if (parts[6] !== undefined) {
					a = 0;
					b = Number(`${parts[5]}${parts[6]}`);
				} else {
					a = Number(`${parts[1]}${parts[2] === "" ? "1" : parts[2]}`);
					b = parts[4] === undefined ? 0 : Number(`${parts[3]}${parts[4]}`);
				}
				// Past the safe range the arithmetic would name another sequence.
				if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return all;
				const named = FIRST_LAST[name.toLowerCase()];
				if (a === 0) {
					return b === 1 && named !== undefined
						? `:${named}`
						: `:${name}(${b})`;
				}
				// An index under 1 matches nothing, so a step forward starts at the
				// first one that does; landing on the step itself is the bare `An`.
				if (a > 0) {
					if (b < 1) b = ((((b - 1) % a) + a) % a) + 1;
					if (b === a) b = 0;
				}
				return `:${name}(${a}n${b === 0 ? "" : b > 0 ? `+${b}` : b})`;
			});
		};
		/**
		 * A comma-separated list split on its own commas — not the ones inside
		 * `:is(…)`, an attribute value or a string. Spelled out again because this
		 * function is serialized into the page.
		 * @param {string} list a selector list
		 * @returns {string[]} its entries
		 */
		const splitList = (list) => {
			const out = [];
			let depth = 0;
			let quote = "";
			let from = 0;
			for (let i = 0; i < list.length; i++) {
				const c = list[i];
				if (c === "\\") {
					i++;
				} else if (quote !== "") {
					if (c === quote) quote = "";
				} else if (c === '"' || c === "'") {
					quote = c;
				} else if (c === "(" || c === "[") {
					depth++;
				} else if (c === ")" || c === "]") {
					depth--;
				} else if (c === "," && depth === 0) {
					out.push(list.slice(from, i).trim());
					from = i + 1;
				}
			}
			out.push(list.slice(from).trim());
			return out;
		};
		/**
		 * A selector list in one order, a repeat dropped — it is a set.
		 * @param {string} list a selector list
		 * @returns {string} its canonical spelling
		 */
		const selectorSet = (list) =>
			[...new Set(splitList(list).map(oneSpelling))].sort().join(", ");
		/**
		 * A grouping rule as the kind of at-rule it is and the condition it holds
		 * under, read through the API that normalizes it where one exists.
		 * @param {CSSRule} rule a grouping rule
		 * @returns {Condition} its kind and condition
		 */
		const conditionOf = (rule) => {
			const at = /^@([a-zA-Z-]+)/.exec(rule.cssText);
			const kind = at === null ? "" : at[1].toLowerCase();
			if (kind === "media") {
				return {
					kind,
					condition: /** @type {CSSMediaRule} */ (rule).media.mediaText
				};
			}
			if (kind === "container") {
				const container = /** @type {CSSContainerRule} */ (rule);
				return {
					kind,
					condition: `${container.containerName || ""}|${
						container.containerQuery
					}`
				};
			}
			if (kind === "supports") {
				return {
					kind,
					condition: /** @type {CSSSupportsRule} */ (rule).conditionText
				};
			}
			const selector = /** @type {CSSStyleRule} */ (rule).selectorText;
			// A nested rule holds under a selector list, which is a set like any other.
			if (selector !== undefined) {
				return { kind: "style", condition: selectorSet(selector) };
			}
			// A `@layer`, `@keyframes` or `@scope` prelude names or selects; there is
			// nothing to evaluate, so it stands as written.
			return { kind, condition: prelude(rule) };
		};
		// `conditionText` is the one prelude the engine hands back verbatim, so a
		// query's own insignificant whitespace has to be dropped here. Only inside
		// `(` `)` and around `:`, where no two tokens can join — a `@scope` prelude
		// or a nested selector spells a combinator with the same space.
		const QUERY_KINDS = new Set(["container", "media", "supports"]);
		/**
		 * @param {Condition} condition a chain entry
		 * @returns {string} it as the one spelling its equals share
		 */
		const conditionKey = ({ kind, condition }) =>
			QUERY_KINDS.has(kind)
				? condition
						.replace(/\(\s+/g, "(")
						.replace(/\s+\)/g, ")")
						.replace(/\s*:\s*/g, ":")
				: condition;
		/**
		 * @param {CSSRuleList} list rules to walk
		 * @param {Condition[]} chain the enclosing at-rules
		 */
		const walk = (list, chain) => {
			for (const rule of list) {
				// Since CSS nesting, a plain style rule carries a `cssRules` list too,
				// so a rule both declares and groups — never one or the other.
				const nested = /** @type {CSSGroupingRule} */ (rule).cssRules;
				const style = /** @type {CSSStyleRule} */ (rule).style;
				// An empty rule renders nothing, so dropping it is safe.
				if (style && style.length > 0) {
					// A bare declaration block nested in a rule stands for `& { … }`.
					const selector = /** @type {CSSStyleRule} */ (rule).selectorText;
					let label =
						(selector ? selectorSet(selector) : selector) ||
						/** @type {CSSKeyframeRule} */ (rule).keyText ||
						// Asked by interface rather than by shape: a nested declaration
						// whose value holds a `{` — `--x:hover { }` — is not a rule with a
						// prelude, however much its text reads like one.
						(nestedDeclarations !== undefined &&
						rule instanceof nestedDeclarations
							? "&"
							: rule.cssText.includes("{")
								? prelude(rule)
								: "&");
					// `&` alone is the rule it sits in, so the block is read as that
					// rule's own — which is what it becomes once an empty rule ahead of
					// it stops splitting the two apart. Only under a style rule: under
					// an at-rule the declarations cannot fold into the parent either.
					let held = chain;
					const inner = chain[chain.length - 1];
					if (label === "&" && inner !== undefined && inner.kind === "style") {
						label = inner.condition;
						held = chain.slice(0, -1);
					}
					// One entry per selector, each carrying what the cascade has said
					// about that selector so far: a printer is free to move a selector
					// between two adjacent lists, so only the per-selector sequence is
					// the thing both sides have to agree on.
					const own = computed(style.cssText, style);
					const block = ` { ${[...own].sort().join(";")} }`;
					const where = held
						.map((one) => `${one.kind}\u0001${conditionKey(one)}`)
						.join("\u0002");
					for (const one of splitList(label)) {
						const key = `${where}\u0003${one}`;
						const earlier = carried.get(key);
						const css =
							earlier === undefined
								? style.cssText
								: `${earlier};${style.cssText}`;
						carried.set(key, css);
						// Read as one block, which is what the cascade reads: a
						// percentage or a `min()` here resolves against the earlier
						// declarations, so the two lists cannot simply be added.
						const list = earlier === undefined ? own : computed(css);
						out.push({
							chain: held,
							label: one,
							list,
							block,
							text: `${one} { ${[...list].sort().join(";")} }`
						});
					}
				}
				if (nested) {
					const inner = conditionOf(rule);
					// A layer block says where its layer is read even when it holds
					// nothing, so it is what fixes that layer's place (see `byLayer`).
					if (inner.kind === "layer") {
						out.push({ chain: [...chain, inner], text: "" });
					}
					walk(nested, [...chain, inner]);
				} else if (!style) {
					// `@import`, `@namespace` and `@property` neither declare nor group,
					// so they are compared as written — under the one spelling a value
					// has, since the engine echoes a descriptor rather than computing
					// it and `3 red` is the `3 rgb(255, 0, 0)` it was handed.
					out.push({ chain, text: canonical(normalizeValue(rule.cssText)) });
				}
			}
		};
		walk(sheet.cssRules, []);
		return out;
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

	// Written from the HTML spec's value grammars rather than from
	// `lib/html/data.js`, so the minifier is checked against the spec and not
	// against its own idea of it.
	//
	// "Strip leading and trailing ASCII whitespace", then the URL parser removes
	// every remaining tab and newline.
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
	// A space-separated list the engine does not reflect as a DOMTokenList.
	const TOKEN_LIST_ATTRIBUTES = new Set([
		"headers",
		"itemprop",
		"itemref",
		"itemtype",
		"ping"
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
		if (name === "style") return computed(raw).sort().join(";");
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
			return raw
				.split(/[\t\n\f\r ]+/)
				.filter(Boolean)
				.sort()
				.join(" ");
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
		// Last: what the engine itself reads the attribute as. An ordinary
		// reflection hands the raw value straight back, so this changes nothing;
		// one "limited to only known values" hands back its canonical keyword,
		// which is the whole of what folding an enumerated value can alter.
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
	 * @param {string} html the page
	 * @returns {Facets} its facets
	 */
	const htmlFacets = (html) => {
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
		/** @type {Rule[][]} */
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
				// The text this element holds itself, so text moved to a neighbor
				// cannot hide in the document-wide concatenation. Only where it
				// reaches the page: whitespace between two `<head>` children, or
				// between `</head>` and `<body>`, renders nothing, and a `<style>` or
				// `<script>` body is data — read as CSS or JSON just below.
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
					styles.push(cssRules(text) || [{ chain: [], text }]);
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
		// Quirks mode changes layout, so the doctype has to survive as one.
		facets.document = [
			doc.compatMode,
			doctype === null
				? "no doctype"
				: `${doctype.name}|${doctype.publicId}|${doctype.systemId}`
		];
		// What the page renders: the title (whose getter strips and collapses ASCII
		// whitespace, as the spec says a title is read) and the body's text. A
		// `<script>` / `<style>` body is data, compared above; a `<template>`'s
		// content does not render; and the whitespace between two `<head>`
		// children renders nothing either.
		facets.text = [
			doc.title,
			doc.body === null ? "" : renderedTextOf(doc.body)
		];
		return { facets, styles };
	};

	/**
	 * Which of a set of container sizes each query holds at, asked of the engine
	 * by building the container and reading a sentinel back out of it.
	 * @param {string[]} conditions `name|query` pairs
	 * @param {number[]} sizes container edge lengths in px
	 * @returns {string[]} one bit per size, per condition
	 */
	const containerSignatures = (conditions, sizes) => {
		const holder = document.createElement("div");
		const inner = document.createElement("div");
		inner.className = "eq-probe";
		holder.append(inner);
		document.body.append(holder);
		const sheet = document.createElement("style");
		document.head.append(sheet);
		const out = conditions.map((condition) => {
			const split = condition.indexOf("|");
			const named = condition.slice(0, split) || "eq";
			const query = condition.slice(split + 1);
			holder.style.cssText = `container-type: size; container-name: ${named}`;
			sheet.textContent = `@container ${named} ${query} { .eq-probe { --eq-hit: 1 } }`;
			return sizes
				.map((size) => {
					holder.style.width = `${size}px`;
					holder.style.height = `${size}px`;
					const hit = getComputedStyle(inner).getPropertyValue("--eq-hit");
					return hit.trim() === "1" ? "1" : "0";
				})
				.join("");
		});
		holder.remove();
		sheet.remove();
		return out;
	};

	/**
	 * @param {string[]} conditions support conditions
	 * @returns {string[]} whether the engine supports each
	 */
	const supportsSignatures = (conditions) =>
		conditions.map((condition) => (CSS.supports(condition) ? "1" : "0"));

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

	/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window)).__eq =
		{
			cssRules,
			htmlFacets,
			containerSignatures,
			supportsSignatures,
			probeReflection,
			canonical,
			paintedColors
		};
};

/**
 * What the engine makes of every at-rule condition in a set of rules. A
 * condition is not compared as text: `(min-width: 200px)` and
 * `(width >= 200px)` are one query written two ways, and the spec says so, so
 * the engine is asked instead — a media query at every viewport that could
 * tell two of them apart, a container query at every container size, a
 * support condition outright. Two conditions that answer alike everywhere are
 * the same condition.
 * @param {import("puppeteer-core").Page} page the page to ask
 * @param {Rule[][]} groups every rule list to be compared
 * @returns {Promise<Map<string, string>>} condition to what the engine answers
 */
const conditionSignatures = async (page, groups) => {
	/** @type {Map<string, Set<string>>} */
	const byKind = new Map();
	for (const rules of groups) {
		for (const rule of rules) {
			for (const { kind, condition } of rule.chain) {
				if (!byKind.has(kind)) byKind.set(kind, new Set());
				/** @type {Set<string>} */ (byKind.get(kind)).add(condition);
			}
		}
	}
	/** @type {Map<string, string>} */
	const signatures = new Map();
	// Sample either side of every length any condition names, so a threshold
	// that moved by one pixel separates them.
	const edges = new Set([1, 200, 400, 600, 800, 1024]);
	for (const conditions of byKind.values()) {
		for (const condition of conditions) {
			for (const [number] of condition.matchAll(/\d+(?:\.\d+)?/g)) {
				const value = Math.round(Number(number));
				// Bounded: each size costs two round trips per condition, and past a
				// point the trips cost more than the separation they buy. Clamped: a
				// viewport of width 0 is not a sample point.
				// Room for the whole triplet, so the cap is never stepped over.
				if (value > 0 && value < 10000 && edges.size <= MAX_SAMPLED_SIZES - 3) {
					edges
						.add(Math.max(1, value - 1))
						.add(value)
						.add(value + 1);
				}
			}
		}
	}
	const sizes = [...edges].sort((a, b) => a - b);

	const supports = [...(byKind.get("supports") || [])];
	if (supports.length > 0) {
		const answers = await page.evaluate(
			(conditions) =>
				/** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq.supportsSignatures(conditions),
			supports
		);
		for (const [i, condition] of supports.entries()) {
			signatures.set(`supports ${condition}`, answers[i]);
		}
	}

	const containers = [...(byKind.get("container") || [])];
	if (containers.length > 0) {
		const answers = await page.evaluate(
			(conditions, at) =>
				/** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq.containerSignatures(conditions, at),
			containers,
			sizes
		);
		for (const [i, condition] of containers.entries()) {
			signatures.set(`container ${condition}`, answers[i]);
		}
	}

	const media = [...(byKind.get("media") || [])];
	if (media.length > 0) {
		/** @type {string[]} */
		const bits = media.map(() => "");
		/** @type {{ width: number, height: number }[]} */
		const viewports = [];
		for (const size of sizes) {
			viewports.push({ width: size, height: 600 });
			viewports.push({ width: 600, height: size });
		}
		for (const viewport of viewports) {
			await page.setViewport(viewport);
			const answers = await page.evaluate(
				(conditions) =>
					conditions.map((condition) =>
						matchMedia(condition).matches ? "1" : "0"
					),
				media
			);
			for (const [i, bit] of answers.entries()) bits[i] += bit;
		}
		// Dimensions no viewport can vary: the media type and the user's stated
		// preferences.
		await page.setViewport({ width: 800, height: 600 });
		/** @type {import("puppeteer-core").MediaFeature[][]} */
		const featureSets = [
			[{ name: "prefers-color-scheme", value: "dark" }],
			[{ name: "prefers-color-scheme", value: "light" }],
			[{ name: "prefers-reduced-motion", value: "reduce" }],
			[{ name: "color-gamut", value: "p3" }]
		];
		for (const type of ["screen", "print"]) {
			for (const features of [[], ...featureSets]) {
				await page.emulateMediaType(type);
				await page.emulateMediaFeatures(features);
				const answers = await page.evaluate(
					(conditions) =>
						conditions.map((condition) =>
							matchMedia(condition).matches ? "1" : "0"
						),
					media
				);
				for (const [i, bit] of answers.entries()) bits[i] += bit;
			}
		}
		await page.emulateMediaType(undefined);
		await page.emulateMediaFeatures([]);
		for (const [i, condition] of media.entries()) {
			signatures.set(`media ${condition}`, bits[i]);
		}
	}
	return signatures;
};

// A `data:` URL as serialized by the CSSOM: its metadata, then the payload.
const DATA_URL_REGEXP = /url\("(data:[^,"]*,)((?:[^"\\]|\\.)*)"\)/gi;

/**
 * Two spellings of one data URI are the same URL — the parser decodes the
 * payload's escapes before anything reads it, so `%3D` and `=` name the same
 * byte. Read both sides decoded so the difference is not a difference.
 * @param {string} text a rule's text
 * @returns {string} it, with every data URI's payload decoded
 */
const decodeDataUrls = (text) =>
	text.replace(DATA_URL_REGEXP, (whole, metadata, payload) => {
		try {
			return `url("${metadata}${decodeURIComponent(payload)}")`;
		} catch (_err) {
			return whole;
		}
	});

/**
 * A rule as the conditions it really holds under and the style it really
 * computes to.
 * @param {Rule} rule a rule
 * @param {Map<string, string>} signatures what the engine answers per condition
 * @returns {string} its key
 */
const keyOf = (rule, signatures) =>
	`${rule.chain
		.map(({ kind, condition }) => {
			const answer = signatures.get(`${kind} ${condition}`);
			if (answer !== undefined) return `@${kind}<${answer}>`;
			// A nested rule holds under its parent's selector list, which is a set
			// like its own — the printer may have sorted it.
			return `@${kind}<${
				kind === "style" ? sortedSelectorList(condition) : condition
			}>`;
		})
		.join(" >> ")} ${decodeDataUrls(rule.text)}`;

/**
 * @param {string} list a selector list
 * @returns {string} it in one order, a repeat dropped
 */
const sortedSelectorList = (list) =>
	[...new Set(splitSelectorList(list))].sort().join(", ");

/**
 * Split a selector list on its own commas — not the ones inside `:is(…)`, an
 * attribute value or a string.
 * @param {string} list a selector list
 * @returns {string[]} its selectors
 */
const splitSelectorList = (list) => {
	const out = [];
	let depth = 0;
	let quote = "";
	let from = 0;
	for (let i = 0; i < list.length; i++) {
		const c = list[i];
		// An escape carries its next code point whatever it is — `.\:\)` ends in
		// a `)` that closes nothing.
		if (c === "\\") {
			i++;
		} else if (quote !== "") {
			if (c === quote) quote = "";
		} else if (c === '"' || c === "'") {
			quote = c;
		} else if (c === "(" || c === "[") {
			depth++;
		} else if (c === ")" || c === "]") {
			depth--;
		} else if (c === "," && depth === 0) {
			out.push(list.slice(from, i).trim());
			from = i + 1;
		}
	}
	out.push(list.slice(from).trim());
	return out;
};

/**
 * One entry per selector, because the printer joins adjacent rules computing
 * the same style into one list. Each still carries its own computed style and
 * its place in the cascade, so a lost or reordered selector fails.
 * @param {Rule[]} rules rules in cascade order
 * @returns {Rule[]} the same, one selector each
 */
const perSelector = (rules) =>
	rules.flatMap((rule) => {
		// `@import` and friends are compared as written, with no `label { … }`.
		const at = rule.text.indexOf(" { ");
		if (at === -1) return [rule];
		const selectors = splitSelectorList(rule.text.slice(0, at));
		if (selectors.length < 2) return [rule];
		const block = rule.text.slice(at);
		return selectors.map((one) => ({
			chain: rule.chain,
			block: rule.block,
			text: one + block
		}));
	});

// An `@layer a, b;` statement, which names layers without holding any rule.
const LAYER_STATEMENT_RE = /^@layer\s+([^{;]+);$/i;

// One number wherever it stands in a value.
const NUMBER_RUN = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;

// The printer rounds a number to six significant digits, so anything derived
// from one — a matrix entry, a resolved font size — lands within a relative
// 1e-5 of what the unrounded input gives. That is under Chromium's own 1/64px
// layout grid at every length a stylesheet uses, which is the bound the
// rounding itself rests on. Wider than that is a difference, not a spelling.
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
 * @param {Rule[]} before the source's rules
 * @param {Rule[]} after the minified rules
 * @param {Map<string, string>} signatures what the engine answers per condition
 * @returns {string} why they differ, or "" when they do not
 */
const compareRules = (before, after, signatures) => {
	/**
	 * @param {string} text a rule's `selector { … }`
	 * @returns {string} the block alone, or the whole text when it has none
	 */
	const blockOf = (text) => {
		const at = text.indexOf(" { ");
		return at === -1 ? text : text.slice(at);
	};
	/**
	 * @param {string} text a rule's `selector { … }`
	 * @returns {string} the selector alone, or the whole text when it has none
	 */
	const selectorOf = (text) => {
		const at = text.indexOf(" { ");
		return at === -1 ? text : text.slice(0, at);
	};
	/**
	 * Read the rules layer by layer, each layer where it is first named. A named
	 * layer's blocks are one layer however far apart they stand, and what lies
	 * between them is in another layer or in none — ordered against them by the
	 * cascade rather than by where it sits, so only the order within a layer is
	 * one the cascade can see. An anonymous `@layer` is a layer of its own, so
	 * each block of one keeps its place.
	 * @param {Rule[]} rules rules in cascade order
	 * @returns {Rule[]} the same rules, gathered by layer
	 */
	const byLayer = (rules) => {
		/** @type {Map<string, Rule[]>} */
		const layers = new Map();
		let anonymous = 0;
		/** @type {Map<EXPECTED_OBJECT, string>} */
		const ids = new Map();
		/**
		 * @param {EXPECTED_OBJECT} each an anonymous layer's chain entry
		 * @returns {string} the identity of the block it opened
		 */
		const idOf = (each) => {
			let id = ids.get(each);
			if (id === undefined) {
				id = ` ${anonymous++}`;
				ids.set(each, id);
			}
			return id;
		};
		// An `@layer a, b;` statement is what names those layers first, whatever
		// order their blocks then stand in, so it opens their buckets.
		for (const rule of rules) {
			const statement = LAYER_STATEMENT_RE.exec(rule.text);
			if (statement === null) continue;
			const outer = rule.chain
				.filter((each) => each.kind === "layer")
				.map((each) => each.condition);
			for (const name of statement[1].split(",")) {
				const key = [...outer, `@layer ${name.trim()}`].join(" ");
				if (!layers.has(key)) layers.set(key, []);
			}
		}
		for (const rule of rules) {
			const chain = rule.chain.filter((each) => each.kind === "layer");
			const anon = chain.some((each) => each.condition.trim() === "@layer");
			const key = anon
				? chain
						.map((each) =>
							each.condition.trim() === "@layer" ? idOf(each) : each.condition
						)
						.join(" ")
				: chain.map((each) => each.condition).join(" ");
			// Every block of one is its own layer, so the key says which block a rule
			// stood in — two of them hold two rules, not one said twice.
			const one = anon
				? {
						...rule,
						chain: rule.chain.map((each) =>
							each.kind === "layer" && each.condition.trim() === "@layer"
								? { ...each, condition: `@layer${idOf(each)}` }
								: each
						)
					}
				: rule;
			const layer = layers.get(key);
			if (layer === undefined) layers.set(key, [one]);
			else layer.push(one);
		}
		// The place-holding entry a layer block left behind has done its work.
		return [...layers.values()].flat().filter((rule) => rule.text !== "");
	};
	// The same selector twice in a row computing the same style is the one rule
	// it resolves to, which is what joining them into a list leaves.
	/**
	 * @param {Rule[]} rules rules in cascade order
	 * @returns {string[]} their keys, an adjacent repeat collapsed
	 */
	const keys = (rules) => {
		const flat = perSelector(byLayer(rules)).map((rule) => ({
			key: keyOf(rule, signatures),
			// Everything but the selector: two entries sharing it are one rule's
			// worth of cascade, whichever of them is written first. A page entry
			// carries its own block, which is what it says before the earlier
			// declarations it is read on top of are folded in.
			group: keyOf(
				{
					chain: rule.chain,
					text: rule.block === undefined ? blockOf(rule.text) : rule.block
				},
				signatures
			),
			// Everything but the block: the one selector under the one condition, so
			// two runs sharing a set of these are one rule's worth of cascade.
			where: keyOf(
				{ chain: rule.chain, text: selectorOf(rule.text) },
				signatures
			)
		}));
		// A run of selectors reaching one block under one condition is the set a
		// join may write in any order, so it is compared in one order.
		/** @type {(typeof flat)[]} */
		const runs = [];
		for (let from = 0; from < flat.length;) {
			let to = from + 1;
			while (to < flat.length && flat[to].group === flat[from].group) to++;
			// One selector written twice inside a run says the same thing twice, and
			// the later entry already carries the earlier one — so it stands in for
			// both, which is what a printer joining the two blocks leaves.
			/** @type {Map<string, typeof flat[0]>} */
			const last = new Map();
			for (let i = from; i < to; i++) last.set(flat[i].where, flat[i]);
			const entries = [...last.values()].sort((one, other) =>
				one.key < other.key ? -1 : 1
			);
			runs.push(entries);
			from = to;
		}
		// A selector carried into the very next run is one rule's declarations
		// split across two blocks — nothing stands between them, so the cascade
		// reads them as one, and the later entry already carries what the earlier
		// one said. Read from the back so a run emptied this way stops standing
		// between its neighbors, whether a printer joined the blocks or not.
		for (let i = runs.length - 2, next = runs.length - 1; i >= 0; i--) {
			const ahead = new Set(runs[next].map(({ where }) => where));
			runs[i] = runs[i].filter((one) => !ahead.has(one.where));
			if (runs[i].length !== 0) next = i;
		}
		// A key written twice is one rule said twice, and the later copy restates it
		// all — so keeping the last is what dropping the dead earlier one leaves.
		const all = runs.flat().map(({ key }) => key);
		/** @type {Map<string, number>} */
		const lastAt = new Map();
		for (const [i, key] of all.entries()) lastAt.set(key, i);
		return all.filter((key, i) => lastAt.get(key) === i);
	};
	const a = keys(before);
	const b = keys(after);
	const shorter = Math.min(a.length, b.length);
	const at = a
		.slice(0, shorter)
		.findIndex((key, i) => !numericallyEqual(key, b[i]));
	if (at !== -1) return `rule ${at}: ${a[at]} vs ${b[at]}`;
	if (a.length > b.length) return `rule dropped: ${a[shorter]}`;
	if (b.length > a.length) return `rule added: ${b[shorter]}`;
	return "";
};

module.exports = {
	benchmarkDocuments,
	benchmarkStylesheets,
	buildCorpus,
	collectFixtures,
	compareRules,
	conditionSignatures,
	installHelpers,
	numericallyEqual
};
