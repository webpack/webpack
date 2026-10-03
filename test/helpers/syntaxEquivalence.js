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
 * @property {(text: string) => string} spacedOnce text as its tokens, spaced one way
 * @property {(element: Element) => string} whereIs an element and its nearest ancestors, for a report
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

	// CSS Images 3 §3.1: a side is the angle pointing at it, and a gradient run
	// bottom to top is its stops read in reverse.
	const SIDE_ANGLES = new Map([
		["to right", "90deg"],
		["to left", "270deg"],
		["to top", "0deg"]
	]);

	/**
	 * Every unprefixed linear gradient with its direction named once: a side as
	 * its angle, and `0deg` over bare color stops as those stops reversed.
	 * @param {string} value a value
	 * @returns {string} the same value, each gradient's direction named once
	 */
	const directGradients = (value) => {
		const opening = /(^|[^\w-])(?:repeating-)?linear-gradient\(/gi;
		let out = "";
		let from = 0;
		let match;
		while ((match = opening.exec(value)) !== null) {
			const open = match.index + match[0].length - 1;
			/** @type {string[]} */
			const args = [];
			let depth = 0;
			let start = open + 1;
			let close = -1;
			for (let i = open; i < value.length; i++) {
				const ch = value[i];
				if (ch === "(") {
					depth++;
				} else if (ch === ")" && --depth === 0) {
					close = i;
					break;
				} else if (ch === "," && depth === 1) {
					args.push(value.slice(start, i).trim());
					start = i + 1;
				}
			}
			if (close === -1) break;
			args.push(value.slice(start, close).trim());
			const angle = SIDE_ANGLES.get(args[0].toLowerCase());
			if (angle !== undefined) args[0] = angle;
			// A stop with a position has a space outside its color's parentheses.
			const bare = args
				.slice(1)
				.every((stop) => !/^[\d.]/.test(stop) && !/\s(?![^(]*\))/.test(stop));
			if (args[0] === "0deg" && bare) {
				args.shift();
				args.reverse();
			}
			out += `${value.slice(from, open + 1)}${args.join(", ")})`;
			from = close + 1;
			opening.lastIndex = from;
		}
		return out + value.slice(from);
	};

	/**
	 * The one spelling of a value the spec gives several names: an easing keyword
	 * is the curve it stands for, `jump-start` names the step position `start`
	 * does, a gradient's last color stop is at the end of the gradient line
	 * whether or not it says so (CSS Images 3 §3.4.3), and a direction is one
	 * flow. A two-position stop needs nothing here: the engine expands it itself.
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
		return outsideText(
			named.replace(
				/(^|[^\w-])((?:repeating-)?(?:linear|radial|conic)-gradient\([^()]*(?:\([^()]*\)[^()]*)*)\s(?:100%|360deg)\)/gi,
				"$1$2)"
			),
			directGradients
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
	 * An element as its tag, and its nearest ancestors as their names and classes.
	 * @param {Element} element an element
	 * @returns {string} where it stands, for a report
	 */
	const whereIs = (element) => {
		const tag = element.outerHTML;
		/** @type {string[]} */
		const path = [tag.slice(0, Math.min(tag.indexOf(">") + 1, 160))];
		for (
			let current = element.parentElement;
			current !== null && path.length < 4 && current.id !== "eq-holder";
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

	// Readers taking between them every token a value holds — a name, string, url,
	// color, number, dimension, function, `[name]`, `/`, any list — and in `calc()`
	// the arithmetic a value leaves for its reader to finish.
	/** @type {[string, string][]} */
	const READERS = [
		["font-family", ""],
		["font", ""],
		["content", ""],
		["background-image", ""],
		["color", ""],
		["border-color", ""],
		["width", ""],
		["scale", ""],
		["transform", ""],
		["box-shadow", ""],
		["transition", ""],
		["grid-template-areas", ""],
		["grid-template-columns", ""],
		["counter-reset", ""],
		["margin-left", "calc"],
		["scale", "calc"]
	];
	// One element per reader, since two shorthands on one would set each other's longhands.
	const readers = READERS.map(() => document.createElement("div"));
	probe.append(...readers);
	/** @type {Map<string, string>} */
	const readCache = new Map();

	/**
	 * @param {string} text a value, or "" to leave the property unset
	 * @returns {string} each reader's computed value, joined
	 */
	const readEach = (text) => {
		for (const [at, [name, wrap]] of READERS.entries()) {
			readers[at].style.cssText = "";
			readers[at].style.setProperty("--eq-read", text);
			readers[at].style.setProperty(
				name,
				wrap === "" ? "var(--eq-read)" : `${wrap}(var(--eq-read))`
			);
		}
		return READERS.map(([name], at) =>
			cascadeValue(name, getComputedStyle(readers[at]).getPropertyValue(name))
		).join("\u0001");
	};

	/**
	 * Text as its tokens, which comments and the spaces beside a delimiter do not change.
	 * @param {string} text text the engine echoes as written
	 * @returns {string} it, spaced one way
	 */
	const spacedOnce = (text) =>
		text
			.replace(/\/\*[\s\S]*?\*\//g, " ")
			.trim()
			.replace(/\s+/g, " ")
			.replace(/ ?([{}()[\],:;/*]) ?/g, "$1");

	/**
	 * A custom property as what substituting it computes in each reader, since
	 * only a reader gives its tokens a meaning. One no reader takes is read as
	 * its text, comments and every space beside a delimiter dropped.
	 * @param {string} value a custom property's computed value
	 * @returns {string} what the readers compute from it
	 */
	const readThrough = (value) => {
		const known = readCache.get(value);
		if (known !== undefined) return known;
		if (!readCache.has("")) readCache.set("", readEach(""));
		// A reader resolves a relative url against the probe's document, where Gecko
		// reads `./a.png` and `.z/a.png` alike, so each address is compared as
		// written too, its quotes and padding dropped.
		const addresses = [
			...value.matchAll(
				/url\([\t\n\f\r ]*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)]*?))[\t\n\f\r ]*\)/gi
			)
		]
			.map(([, double, single, bare]) =>
				double !== undefined ? double : single !== undefined ? single : bare
			)
			.join("\u0002");
		const through = `${readEach(value)}\u0003${addresses}`;
		const read =
			through === `${readCache.get("")}\u0003${addresses}`
				? spacedOnce(value)
				: through;
		readCache.set(value, read);
		return read;
	};

	/**
	 * A value an element computes, in the one spelling rules are compared in: a
	 * custom property as what reading it computes, anything else named once, its
	 * colors painted and its data URLs decoded.
	 * @param {string} property the property
	 * @param {string} value its computed value
	 * @returns {string} the value, spelled once
	 */
	const cascadeValue = (property, value) => {
		if (property.startsWith("--")) return readThrough(value);
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
			cascadeValue,
			spacedOnce,
			whereIs
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
	// WHY: WebKit can leave a frame's `load` or `document.fonts.ready` pending
	// for good on a page whose subresource the policy blocks, so each wait is
	// bounded; what is read then is the page as far as it got.
	const PATIENCE = 3000;
	/** @type {HTMLIFrameElement} */
	let frame = document.createElement("iframe");

	/**
	 * @param {Promise<unknown>} pending what to wait for
	 * @returns {Promise<boolean>} whether it settled within the patience
	 */
	const settled = (pending) =>
		Promise.race([
			pending.then(() => true),
			new Promise((resolve) => {
				setTimeout(() => resolve(false), PATIENCE);
			})
		]);

	/**
	 * A fresh frame per document, so a late event of one cannot be the next one's.
	 * @param {string} html a document
	 * @returns {Promise<boolean>} whether the frame finished loading it
	 */
	const render = (html) => {
		frame.remove();
		frame = document.createElement("iframe");
		frame.setAttribute("sandbox", "allow-same-origin");
		frame.style.cssText = `width:${width}px;height:800px;border:0`;
		const loaded = settled(
			new Promise((resolve) => {
				frame.addEventListener("load", () => resolve(undefined), {
					once: true
				});
			})
		);
		frame.srcdoc = html;
		document.body.append(frame);
		return loaded;
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
	 * @returns {Promise<{ tags: string[], where: string[], boxes: number[][][], styled: string[], withoutAlt: string, text: string, title: string, size: string }>} what the frame renders
	 */
	const measure = async () => {
		const doc = /** @type {Document} */ (frame.contentDocument);
		await settled(doc.fonts.ready);
		// WHY: how Chrome boxes a broken `<img>` with no `alt` follows how far its
		// fetch got — 0x0 where none was made, a 16x16 icon where one came back
		// undecodable — so on a page whose images cannot load it is timing, not the
		// printer, that decides; measured in CI on srcset.html, both orders at once.
		// An empty `alt` makes one represent nothing, but only where it is there as
		// the element breaks: setting it afterwards leaves the icon, so each image
		// is loaded again under it. Which had one is compared on its own, so a
		// dropped `alt=""` still shows.
		/** @type {number[]} */
		const withoutAlt = [];
		/** @type {Promise<unknown>[]} */
		const breaking = [];
		for (const [at, image] of [...doc.images].entries()) {
			if (image.hasAttribute("alt")) continue;
			withoutAlt.push(at);
			// A clone runs the image update algorithm again, whatever names the
			// source — an `src`, a `srcset` or a `<source>` beside it.
			const under = /** @type {HTMLImageElement} */ (image.cloneNode(true));
			under.setAttribute("alt", "");
			image.replaceWith(under);
			if (under.complete) continue;
			breaking.push(
				new Promise((resolve) => {
					under.addEventListener("load", resolve, { once: true });
					under.addEventListener("error", resolve, { once: true });
				})
			);
		}
		if (breaking.length > 0) await settled(Promise.all(breaking));
		// A transition or animation would be read part way through.
		for (const running of doc.getAnimations()) running.cancel();
		const root = /** @type {HTMLElement} */ (doc.documentElement);
		const elements = [...doc.querySelectorAll("*")];
		return {
			tags: elements.map((element) => element.localName),
			where: elements.map(
				/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window))
					.__eq.whereIs
			),
			// What a `<marquee>` holds moves as it scrolls, whenever it is read.
			boxes: elements.map((element) =>
				element.closest("marquee") === null ? boxesOf(element) : []
			),
			styled: elements.map(styledBy),
			withoutAlt: withoutAlt.join(" "),
			text: root.innerText,
			title: doc.title,
			size: `${root.scrollWidth}x${root.scrollHeight}`
		};
	};

	/**
	 * @param {RenderPair} pair a page and its minified copy
	 * @returns {Promise<{ loaded: boolean[], before: Awaited<ReturnType<typeof measure>>, after: Awaited<ReturnType<typeof measure>> }>} whether each loaded, and what each renders
	 */
	const renderBoth = async (pair) => {
		const loaded = [await render(pair.before)];
		const before = await measure();
		loaded.push(await render(pair.after));
		return { loaded, before, after: await measure() };
	};

	/** @type {RenderReport[]} */
	const reports = [];
	for (const pair of pairs) {
		let rendered = await renderBoth(pair);
		// WHY: on a busy machine one copy can miss the patience and be read unloaded
		// — measured locally on wpt/css layer-media-query.html — so a pair where
		// only one loaded renders again; a copy that truly never loads still differs.
		if (rendered.loaded[0] !== rendered.loaded[1]) {
			rendered = await renderBoth(pair);
		}
		const { loaded, before, after } = rendered;
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
		if (before.withoutAlt !== after.withoutAlt) {
			differences.push(
				`images without alt: ${before.withoutAlt} -> ${after.withoutAlt}`
			);
		}
		if (loaded[0] !== loaded[1]) {
			differences.push(`loaded: ${loaded[0]} -> ${loaded[1]}`);
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
	// WHY: a theme is a class on `html` or `body`, and a document has one of
	// each — so both sheets also let a built `div` stand for one, at the same
	// specificity, which is what reaches `body.dark` beside `body.light`.
	const DOCUMENT_TYPES = /(^|[\s>+~(,])(html|body)(?![\w-])/gi;
	// The pseudo-elements `getComputedStyle` reads, beyond the two every element has.
	const PSEUDOS =
		/::(marker|placeholder|first-line|first-letter|selection|backdrop|file-selector-button)(?![\w-])/gi;
	// What `content` computes to on a pseudo-element that renders nothing.
	const NO_CONTENT = /^(?:none|normal)$/;
	const { cascadeValue, spacedOnce, whereIs } =
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

	/** @typedef {{ combinator: string, type: string, classes: string[], id: string, attributes: [string, string][], before: number, after: number, typed: boolean, counted: string, has: { combinator: string, chain: Compound[] }[] }} Compound */

	/**
	 * The position among its siblings an `An+B` argument picks for an element to
	 * stand at: the second it matches, so `odd` is not also `:first-child`.
	 * @param {string} argument the argument, an `of S` part included
	 * @returns {number} the position, counted from 1, or 0 where none is built
	 */
	const nthPosition = (argument) => {
		const text = argument
			.replace(/\s+of\s[\s\S]*$/i, "")
			.replace(/\s+/g, "")
			.toLowerCase();
		const spelled = text === "odd" ? "2n+1" : text === "even" ? "2n" : text;
		const match = /^(?:([+-]?\d*)n)?([+-]?\d+)?$/.exec(spelled);
		if (match === null || spelled === "") return 0;
		const step =
			match[1] === undefined
				? 0
				: match[1] === "" || match[1] === "+"
					? 1
					: match[1] === "-"
						? -1
						: Number(match[1]);
		const offset = match[2] === undefined ? 0 : Number(match[2]);
		let position = offset;
		if (step > 0) {
			const first =
				offset >= 1 ? offset : offset + step * Math.ceil((1 - offset) / step);
			position = first + step;
		}
		// A sibling list is built for it, so a far position is left unbuilt.
		return position >= 1 && position <= 12 ? position : 0;
	};

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
			attributes: [],
			before: 0,
			after: 0,
			typed: false,
			counted: "",
			has: []
		});
		/**
		 * Takes in the first selector of a list when it is one compound, since the
		 * element has to match it too.
		 * @param {Compound} into the compound to take it into
		 * @param {string} list the selector list
		 * @returns {void}
		 */
		const absorb = (into, list) => {
			const [first] = splitList(list);
			const inner = parseSelector(first);
			if (inner === null || inner.length !== 1) return;
			const [one] = inner;
			if (one.type !== "") into.type = one.type;
			if (one.id !== "") into.id = one.id;
			into.classes.push(...one.classes);
			into.attributes.push(...one.attributes);
			into.before = Math.max(into.before, one.before);
			into.after = Math.max(into.after, one.after);
			into.typed = into.typed || one.typed;
			if (one.counted !== "") into.counted = one.counted;
			into.has.push(...one.has);
		};
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
					const argument = selector.slice(open + 1, at - 1);
					const pseudo = name[0].toLowerCase();
					if (/^:nth-(?:last-)?(?:child|of-type)$/.test(pseudo)) {
						const position = nthPosition(argument) - 1;
						if (pseudo.startsWith(":nth-last")) {
							current.after = Math.max(current.after, position);
						} else {
							current.before = Math.max(current.before, position);
						}
						if (pseudo.endsWith("of-type")) current.typed = true;
						// `of S` counts only siblings matching S, which it matches too.
						const of = /\sof\s([\s\S]*)$/i.exec(argument);
						if (of !== null) {
							current.counted = of[1].trim();
							absorb(current, of[1]);
						}
					} else if (pseudo === ":has") {
						const [relative] = splitList(argument);
						const leading = /^\s*([>+~]?)\s*/.exec(relative);
						const combinator = leading === null ? "" : leading[1];
						const inner = parseSelector(
							relative.slice(leading === null ? 0 : leading[0].length)
						);
						if (inner !== null) {
							current.has.push({ combinator: combinator || " ", chain: inner });
						}
					}
					if (/^:(?:is|where)$/i.test(name[0])) absorb(current, argument);
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
	 * Counts the siblings on one side of an element that its `:nth-*()` counts.
	 * @param {Element} element the element
	 * @param {Compound} compound what it carries
	 * @param {boolean} following whether the ones after it, not before
	 * @returns {number} how many there are
	 */
	const countSiblings = (element, compound, following) => {
		let count = 0;
		for (
			let at = following
				? element.nextElementSibling
				: element.previousElementSibling;
			at !== null;
			at = following ? at.nextElementSibling : at.previousElementSibling
		) {
			if (compound.typed && at.localName !== element.localName) continue;
			if (compound.counted !== "") {
				try {
					if (!at.matches(compound.counted)) continue;
				} catch (_err) {
					// A selector the engine will not read counts no sibling.
					continue;
				}
			}
			count++;
		}
		return count;
	};

	/**
	 * Builds a chain where its selector reaches its last element: each compound
	 * at the position among its siblings it names, holding what its `:has()` asks.
	 * @param {Document} doc the document to build in
	 * @param {Compound[]} chain the compounds
	 * @param {Element} anchor what the first compound joins
	 * @param {string} combinator how it joins it — a relative selector's own
	 * @returns {Element | null} the last element, or null where none was built
	 */
	const buildChain = (doc, chain, anchor, combinator) => {
		/** @type {Element | null} */
		let last = null;
		for (const compound of chain) {
			// A document has one of each, and the root already stands inside them.
			if (DOCUMENT_ELEMENTS.has(compound.type)) {
				if (last === null) continue;
				break;
			}
			const element = build(doc, compound);
			const joined = last === null ? combinator : compound.combinator;
			const target = last === null ? anchor : last;
			if (joined === "+" || joined === "~") target.after(element);
			else target.append(element);
			const sibling = () =>
				build(doc, { ...compound, id: "", before: 0, after: 0, has: [] });
			// In front of the pair `+` joins, which cannot be parted.
			const front = joined === "+" ? target : element;
			for (
				let i = compound.before - countSiblings(element, compound, false);
				i > 0;
				i--
			) {
				front.before(sibling());
			}
			for (
				let i = compound.after - countSiblings(element, compound, true);
				i > 0;
				i--
			) {
				element.after(sibling());
			}
			for (const held of compound.has) {
				buildChain(doc, held.chain, element, held.combinator);
			}
			last = element;
		}
		return last;
	};

	/**
	 * @returns {Promise<HTMLIFrameElement>} a frame holding an empty standards-mode document
	 */
	const openFrame = () =>
		new Promise((resolve) => {
			const frame = document.createElement("iframe");
			// WHY: WebKit stops rendering an iframe wholly outside the viewport, and
			// then resolves a box-less element's style with nothing inherited — so
			// both frames stand at the corner, where neither is ever below the fold.
			frame.style.cssText =
				"border:0;display:block;position:absolute;top:0;left:0;width:1400px;height:800px";
			frame.addEventListener("load", () => resolve(frame), { once: true });
			frame.srcdoc =
				"<!doctype html><html data-eq-html data-eq-root><head></head><body data-eq-body></body></html>";
			document.body.append(frame);
		});

	// The page waits on its own frames, bounded by a timer, as a page an engine
	// reads as hidden gets none.
	/**
	 * @returns {Promise<void>} once the page has rendered twice, or 100ms passed
	 */
	const settle = () =>
		new Promise((resolve) => {
			const timer = setTimeout(resolve, 100);
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					clearTimeout(timer);
					resolve(undefined);
				})
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
		// Sized, so a percentage resolves to a length rather than to zero.
		probe.style.cssText = "width:97px;height:89px";
		probe.style.setProperty(name, value);
		return probe.style.getPropertyValue(name) === ""
			? value
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
	 * @property {Set<string>} referenced every custom property a `var()` names with no fallback
	 * @property {Set<string>} defaulted every custom property a `var()` names with a fallback
	 * @property {Set<string>} registered every custom property an `@property` rule registers
	 * @property {string[]} layers every layer in the order the cascade ranks them, which is where each is first named
	 * @property {Set<string>} containerNames every container a query names
	 * @property {boolean} queried whether any container query is written
	 * @property {string[]} described what no element shows, as the engine serializes it
	 * @property {Map<string, string>} unobserved per selector or keyframe and property under `@starting-style` or `@keyframes`, the declaration that wins
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
			referenced: new Set(),
			defaulted: new Set(),
			registered: new Set(),
			layers: [],
			containerNames: new Set(),
			queried: false,
			described: [],
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
						const mapped = any.selectorText
							.replace(STATES, "$1[data-eq-$2]")
							.replace(
								/:(dir|lang)\(\s*["']?([\w-]+)["']?\s*\)/gi,
								"[data-eq-$1-$2]"
							)
							.replace(DOCUMENT_TYPES, "$1:is(div, $2):where([data-eq-$2])")
							.replace(/:root(?![\w-])/gi, ":is([data-eq-root], :root)");
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
					/** @type {string[]} */
					const substitutes = [];
					for (const [, name, comma] of text.matchAll(
						/var\(\s*(--[\w-]+)\s*(,?)/g
					)) {
						substitutes.push(name);
						(comma === "" ? out.referenced : out.defaulted).add(name);
					}
					// `light-dark()` shows its second color only under a dark color scheme.
					const darkened = /light-dark\(/i.test(text);
					if (darkened) addAll(out.atLength, "dark", own);
					for (let i = 0; i < style.length; i++) {
						const property = style.item(i);
						const entry = `${where}\u0001${
							style.getPropertyValue(property) || text
						}\u0001${style.getPropertyPriority(property)}`;
						const sequence = out.sequences.get(property);
						if (sequence === undefined) out.sequences.set(property, [entry]);
						else sequence.push(entry);
						addAll(out.selectors, property, own);
						if (lengths.length > 0 || darkened) out.conditioned.add(property);
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
						`${context}@${kind === "CSSMediaRule" ? "media" : `container ${any.containerName}`} ${spacedOnce(condition)}`,
						parents,
						scope,
						[
							...lengths,
							...named.width.map((px) => `${prefix}width${px}`),
							...named.height.map((px) => `${prefix}height${px}`),
							...(/prefers-color-scheme/i.test(condition) ? ["dark"] : []),
							// A query naming no length still holds at some sizes and not others.
							`${prefix}any`
						]
					);
				} else if (kind === "CSSSupportsRule") {
					walk(
						any.cssRules,
						`${context}@supports ${spacedOnce(any.conditionText)}`,
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
					// Read per offset and property, the one that wins there, since a
					// printer may join or split the keyframes declaring it.
					for (const frame of any.cssRules) {
						const style = /** @type {CSSStyleDeclaration} */ (frame.style);
						for (const offset of frame.keyText.split(",")) {
							for (let i = 0; i < style.length; i++) {
								const name = style.item(i);
								out.unobserved.set(
									`${context}@keyframes ${any.name} ${offset.trim()} ${name}`,
									computedAs(name, style.getPropertyValue(name))
								);
							}
						}
					}
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
					if (kind === "CSSPropertyRule") out.registered.add(any.name);
					// A font face, a counter style, a page or a registered property. An
					// adopted sheet holds no import.
					const text = rule.cssText;
					out.described.push(
						`${context}${
							any.style === undefined
								? spacedOnce(text)
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
			// CSS Syntax §3.2: decoding drops a leading byte order mark, which
			// `replaceSync` would read as part of the first selector.
			sheet.replaceSync(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
			docs[at].adoptedStyleSheets = [sheet];
			return readSheet(sheet);
		});
		const [one, other] = readings;
		/** @type {StyleDifference[]} */
		const moved = [];
		for (const key of new Set([
			...one.unobserved.keys(),
			...other.unobserved.keys()
		])) {
			const [a, b] = [one.unobserved.get(key), other.unobserved.get(key)];
			if (a !== b && moved.length < KEPT) {
				moved.push({
					at: key,
					moved: [["", String(a), String(b), String(a), String(b)]]
				});
			}
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
			// A `span` too: a value dropped can leave a `div` as it was and not a `span`.
			const named = new Set(["div", "span", ...types]);
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
					const last = buildChain(doc, chain, box(), "");
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
				/** @type {Compound} */
				const everything = {
					combinator: "",
					type: "",
					classes: [...classes],
					id: "",
					attributes: [...attributes],
					before: 0,
					after: 0,
					typed: false,
					counted: "",
					has: []
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
		 * @param {{ width: number, height: number, box: number, dark?: boolean }[]} samples where to read
		 * @param {Set<string> | null} only the properties these samples can move, or null for any
		 */
		const measure = async (built, samples, only) => {
			await settle();
			for (const sample of samples) {
				if (moved.length >= KEPT) return;
				for (const [at, frame] of frames.entries()) {
					frame.style.width = `${sample.width}px`;
					frame.style.height = `${sample.height}px`;
					// CSS Color Adjust 1 §2.3: a frame's `prefers-color-scheme` follows
					// the color scheme its embedding element is used with, and an
					// element's `light-dark()` the color scheme it is used with itself.
					frame.style.colorScheme = sample.dark ? "dark" : "";
					/** @type {HTMLElement} */ (
						docs[at].documentElement
					).style.setProperty("color-scheme", sample.dark ? "dark" : "");
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
				/** @returns {boolean[][]} per frame, whether each element has a box */
				const boxes = () =>
					read.map((list) =>
						list.map((element) => element.getClientRects().length !== 0)
					);
				let rendered = boxes();
				// A box in one frame alone is read after a render, so a frame the engine
				// has yet to lay out is not taken for a sheet hiding the element.
				if (rendered[0].some((one, i) => one !== rendered[1][i])) {
					await settle();
					rendered = boxes();
				}
				// Cancelled before any value is read, so none is part way through one.
				for (const doc of docs) {
					for (const running of doc.getAnimations()) running.cancel();
				}
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
						if (changed.length === 0) continue;
						found.push({
							i,
							pseudo,
							at: `${sample.width}x${sample.height}${sample.dark ? " dark" : ""}${sample.box ? ` in ${sample.box}px` : ""}: ${whereIs(read[0][i])}${pseudo}`,
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

		// WHY: a value naming a custom property no sheet defines computes to
		// nothing, which hides a broken `calc()` around it — so each such name holds
		// a length. One also named with a fallback is left unset, or that would hide.
		/** @type {string[]} */
		const unset = [];
		for (const reading of readings) {
			for (const name of reading.referenced) {
				if (
					readings.every(
						(each) =>
							!each.sequences.has(name) &&
							!each.registered.has(name) &&
							!each.defaulted.has(name)
					) &&
					!unset.includes(name)
				) {
					unset.push(name);
				}
			}
		}
		for (const doc of docs) {
			/** @type {HTMLElement} */ (doc.documentElement).style.cssText = unset
				.map((name) => `${name}:1px`)
				.join(";");
		}

		let elementCount = 0;
		let sampled = 0;
		if (properties.length > 0) {
			// Everything at two widths, then the dark color scheme and a pixel under,
			// at and over every length a query names, reading only what the rules
			// under such a query reach.
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
				if ((found === null && key !== "dark") || conditioned.length === 0) {
					continue;
				}
				if (sampled + 3 > MAX_SAMPLES || moved.length >= KEPT) break;
				/** @type {Set<string>} */
				const reached = new Set();
				for (const reading of readings) {
					for (const selector of reading.atLength.get(key) || []) {
						if (chains.has(selector)) reached.add(selector);
					}
				}
				const part = populate([...reached]);
				await measure(
					part,
					found === null
						? [360, 1400].map((width) => ({
								width,
								height: 800,
								box: 0,
								dark: true
							}))
						: [
								Math.max(1, Number(found[3]) - 1),
								Number(found[3]),
								Number(found[3]) + 1
							].map((size) => ({
								width:
									found[1] === "box" || found[2] === "height" ? 1400 : size,
								height:
									found[1] !== "box" && found[2] === "height" ? size : 800,
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
