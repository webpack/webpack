/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// The printer's promise to a target, held over its own output: what it writes
// for a browserslist selection, every browser in that selection reads.

// Asked per browser, not per selection: one engine dropping a rule is the rule
// gone for that engine's users, whatever the rest of the selection reads.

// The tables are the printer's (`lib/css/data.js`); the reading of them is not.
// A defect in how the printer applies a table is what this is here to catch.

const {
	PREFIXED_SELECTORS,
	PREFIX_WINDOWS,
	PREFIX_WINDOW_STARTS,
	SELECTOR_SUPPORTED_FROM,
	SUPPORTED_FROM,
	SUPPORT_BROWSERS,
	SUPPORT_PROFILES,
	VALUE_SUPPORT_PACKED
} = require("../lib/css/data");
const {
	TT_COLON,
	TT_COMMA,
	TT_DIMENSION,
	TT_EOF,
	TT_FUNCTION,
	TT_HASH,
	TT_IDENTIFIER,
	TT_LEFT_CURLY_BRACKET,
	TT_LEFT_PARENTHESIS,
	TT_LEFT_SQUARE_BRACKET,
	TT_NUMBER,
	TT_PERCENTAGE,
	TT_RIGHT_CURLY_BRACKET,
	TT_RIGHT_PARENTHESIS,
	TT_RIGHT_SQUARE_BRACKET,
	TT_SEMICOLON,
	TT_WHITESPACE,
	TokenStream
} = require("../lib/css/syntax-parser");

/** @typedef {import("./compare-tools-harness").Report} Report */

/**
 * @typedef {object} Browser
 * @property {string} name the browserslist entry, as the report names it
 * @property {number} slot its column in a `SUPPORT_PROFILES` row
 * @property {number} version `major * 100000 + minor`, as the tables write it
 */

/**
 * @typedef {object} Rule
 * @property {"style" | "at" | "keyframe" | "invalid"} kind what its prelude is
 * @property {string} prelude the prelude, as written
 * @property {string} name the at-rule's lowercased name, or ""
 * @property {boolean} nested whether a style rule holds it, at any depth
 * @property {string[]} selectors each complex selector of a style rule's list
 * @property {Rule | null} parent the rule it is written in
 * @property {Declaration[]} declarations the declarations its block holds
 * @property {string} text the whole rule, as written
 * @property {number} order its place among the statements of the sheet
 */

/**
 * @typedef {object} Declaration
 * @property {string} property the lowercased property name
 * @property {string} value the value, as written, `!important` included
 * @property {string} text the declaration, as written
 * @property {Rule | null} rule the rule it is written in
 * @property {number} order its place among the statements of the sheet
 */

/**
 * @typedef {object} Sheet
 * @property {Rule[]} rules every rule, in source order
 * @property {Declaration[]} declarations every declaration, in source order
 */

// Each browser by its column in a `SUPPORT_PROFILES` row.
/** @type {Map<string, number>} */
const SLOT = new Map(SUPPORT_BROWSERS.map((name, at) => [name, at]));

/**
 * A browserslist version as the tables encode it, as the printer reads one: a
 * range at its low end, `TP` newer than any release and `all` oldest.
 * @param {string} version the version part of a `"name version"` entry
 * @returns {number | null} the encoded version, or null when unreadable
 */
const encodeVersion = (version) => {
	if (version === "TP") return 1e9 - 1;
	if (version === "all") return 0;
	const [low] = version.split("-");
	const [major, minor] = low.split(".");
	const encoded = Number.parseInt(major, 10);
	if (Number.isNaN(encoded)) return null;
	return encoded * 100000 + (Number.parseInt(minor, 10) || 0);
};

/**
 * The browsers a selection names that the tables answer for. One they do not
 * name is one nothing states support for, and is left out, as the printer does.
 * @param {readonly string[]} browsers a browserslist selection
 * @returns {Browser[]} each browser the tables can be asked about
 */
const targetBrowsers = (browsers) => {
	/** @type {Browser[]} */
	const out = [];
	for (const entry of browsers) {
		const space = entry.indexOf(" ");
		if (space === -1) continue;
		const slot = SLOT.get(entry.slice(0, space));
		const version = encodeVersion(entry.slice(space + 1));
		if (slot === undefined || version === null) continue;
		out.push({ name: entry, slot, version });
	}
	return out;
};

/**
 * Whether one browser is at or past one support profile.
 * @param {Browser} browser the browser
 * @param {number | undefined} profile a `SUPPORT_PROFILES` row, undefined for none
 * @returns {boolean} true when it reads what the row stands for
 */
const readsProfile = (browser, profile) =>
	profile !== undefined &&
	browser.version >=
		SUPPORT_PROFILES[profile * SUPPORT_BROWSERS.length + browser.slot];

/**
 * @param {Browser} browser the browser
 * @param {string} feature a `SUPPORTED_FROM` key
 * @returns {boolean} true when it reads the feature
 */
const readsFeature = (browser, feature) =>
	readsProfile(browser, SUPPORTED_FROM.get(feature));

// A vendor spelling of a pseudo, back to the windows of the pseudo it spells.
/** @type {Map<string, number>} */
const PREFIXED_PSEUDO_WINDOWS = new Map();
for (const [, spellings] of PREFIXED_SELECTORS) {
	for (const [spelling, windows] of spellings) {
		PREFIXED_PSEUDO_WINDOWS.set(spelling, windows);
	}
}

/**
 * Whether one browser reads a pseudo-class or pseudo-element, by the spelling
 * a selector carries (`:hover`, `::before`, `:-webkit-autofill`). A vendor
 * spelling is read from where its window opens; a pseudo no table names, never.
 * @param {Browser} browser the browser
 * @param {string} pseudo the lowercased spelling, colons included
 * @returns {boolean} true when it reads the pseudo
 */
const readsPseudo = (browser, pseudo) => {
	const profile =
		SELECTOR_SUPPORTED_FROM.get(pseudo) ||
		// CSS 2 wrote four pseudo-elements with one colon, and every engine reads both.
		(pseudo[1] !== ":" ? SELECTOR_SUPPORTED_FROM.get(`:${pseudo}`) : undefined);
	if (profile !== undefined) return readsProfile(browser, profile);
	const windows = PREFIXED_PSEUDO_WINDOWS.get(pseudo.replace(/^::?/, ""));
	if (windows === undefined) return false;
	const end = PREFIX_WINDOW_STARTS[windows + 1];
	for (let at = PREFIX_WINDOW_STARTS[windows]; at < end; at += 3) {
		if (
			PREFIX_WINDOWS[at] === browser.slot &&
			browser.version >= PREFIX_WINDOWS[at + 1]
		) {
			return true;
		}
	}
	return false;
};

/** @type {Map<string, number> | null} */
let _valueSupport = null;

/**
 * When browsers first read one value, by the key `VALUE_SUPPORT_PACKED` names
 * it with: `"<property> <keyword>"`, or a color function's bare name.
 * @param {string} key the key
 * @returns {number | undefined} its `SUPPORT_PROFILES` row, undefined where no table says
 */
const valueProfile = (key) => {
	if (_valueSupport === null) {
		_valueSupport = new Map();
		for (const group of VALUE_SUPPORT_PACKED.split("|")) {
			const colon = group.indexOf(":");
			const property = group.slice(0, colon);
			const prefix = property.length === 0 ? "" : `${property} `;
			const entries = group.slice(colon + 1).split(" ");
			for (let at = 0; at < entries.length; at += 2) {
				_valueSupport.set(prefix + entries[at], Number(entries[at + 1]));
			}
		}
	}
	return _valueSupport.get(key);
};

// At-rules whose block holds keyframes rather than style rules or declarations.
const KEYFRAMES_RE = /^(?:-[a-z]+-)?keyframes$/;

/**
 * A stylesheet's rules and declarations, read from its tokens alone: a block
 * statement is a rule, a `;`-ended one a declaration, and a custom property's
 * value keeps the `{}` it holds, as CSS Syntax 3 §5.4.4 reads it.
 * @param {string} css a stylesheet
 * @returns {Sheet} what it holds
 */
const readSheet = (css) => {
	/** @type {Rule[]} */
	const rules = [];
	/** @type {Declaration[]} */
	const declarations = [];
	const stream = new TokenStream(css);
	let order = 0;
	/**
	 * @param {Rule | null} parent the rule whose block this is, null at top level
	 * @returns {number} where the block ended
	 */
	const block = (parent) => {
		let start = -1;
		let depth = 0;
		for (;;) {
			const token = stream.consume();
			const type = token.type;
			if (type === TT_EOF) {
				statement(parent, start, css.length);
				return css.length;
			}
			if (type === TT_WHITESPACE && start === -1) continue;
			if (start === -1) start = token.start;
			if (
				type === TT_FUNCTION ||
				type === TT_LEFT_PARENTHESIS ||
				type === TT_LEFT_SQUARE_BRACKET
			) {
				depth++;
			} else if (
				type === TT_RIGHT_PARENTHESIS ||
				type === TT_RIGHT_SQUARE_BRACKET
			) {
				if (depth !== 0) depth--;
			} else if (depth !== 0) {
				continue;
			} else if (type === TT_SEMICOLON) {
				statement(parent, start, token.start);
				start = -1;
			} else if (type === TT_RIGHT_CURLY_BRACKET) {
				if (start !== token.start) statement(parent, start, token.start);
				if (parent !== null) return token.end;
				start = -1;
			} else if (type === TT_LEFT_CURLY_BRACKET) {
				const head = css.slice(start, token.start);
				if (/^--[^:]*:/.test(head)) {
					// A custom property's `{}` is part of its value.
					skipBlock();
					continue;
				}
				const rule = openRule(parent, head, start);
				const end = block(rule);
				rule.text = css.slice(start, end);
				start = -1;
			}
		}
	};
	/**
	 * Steps over a block a custom property's value holds.
	 * @returns {void}
	 */
	const skipBlock = () => {
		let depth = 1;
		for (;;) {
			const type = stream.consume().type;
			if (type === TT_EOF) return;
			if (type === TT_LEFT_CURLY_BRACKET) depth++;
			else if (type === TT_RIGHT_CURLY_BRACKET && --depth === 0) return;
		}
	};
	/**
	 * @param {Rule | null} parent the rule it is written in
	 * @param {string} head its prelude, as written
	 * @param {number} start where it starts
	 * @returns {Rule} the rule
	 */
	const openRule = (parent, head, start) => {
		const prelude = head.trim();
		const nested =
			parent !== null && (parent.kind === "style" || parent.nested);
		/** @type {Rule} */
		let rule;
		if (prelude.startsWith("@")) {
			const name = /^@([-\w]+)/.exec(prelude);
			rule = {
				kind: "at",
				prelude,
				name: name === null ? "" : name[1].toLowerCase(),
				nested,
				selectors: [],
				parent,
				declarations: [],
				text: css.slice(start),
				order: order++
			};
		} else {
			const keyframe =
				parent !== null &&
				parent.kind === "at" &&
				KEYFRAMES_RE.test(parent.name);
			// `prop: {value}` is a declaration no property takes, and read as a rule
			// its selector is nothing, so every engine drops it either way.
			const invalid = !keyframe && /:\s*$/.test(prelude);
			rule = {
				kind: keyframe ? "keyframe" : invalid ? "invalid" : "style",
				prelude,
				name: "",
				nested,
				selectors: keyframe || invalid ? [] : splitList(prelude),
				parent,
				declarations: [],
				text: css.slice(start),
				order: order++
			};
		}
		rules.push(rule);
		return rule;
	};
	/**
	 * @param {Rule | null} parent the rule it is written in
	 * @param {number} start where it starts
	 * @param {number} end where it ends, its `;` left out
	 */
	const statement = (parent, start, end) => {
		if (start === -1 || start >= end) return;
		const text = css.slice(start, end).trim();
		if (text.length === 0) return;
		if (text.startsWith("@")) {
			const name = /^@([-\w]+)/.exec(text);
			rules.push({
				kind: "at",
				prelude: text,
				name: name === null ? "" : name[1].toLowerCase(),
				nested: parent !== null && (parent.kind === "style" || parent.nested),
				selectors: [],
				parent,
				declarations: [],
				text,
				order: order++
			});
			return;
		}
		const colon = text.indexOf(":");
		if (colon === -1) return;
		/** @type {Declaration} */
		const declaration = {
			property: text.slice(0, colon).trim().toLowerCase(),
			value: text.slice(colon + 1).trim(),
			text,
			rule: parent,
			order: order++
		};
		declarations.push(declaration);
		if (parent !== null) parent.declarations.push(declaration);
	};
	block(null);
	return { rules, declarations };
};

/**
 * One selector list's complex selectors, split at its top-level commas.
 * @param {string} list the list, as written
 * @returns {string[]} each one, trimmed
 */
const splitList = (list) => {
	/** @type {string[]} */
	const out = [];
	const stream = new TokenStream(list);
	let depth = 0;
	let from = 0;
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		if (
			token.type === TT_FUNCTION ||
			token.type === TT_LEFT_PARENTHESIS ||
			token.type === TT_LEFT_SQUARE_BRACKET
		) {
			depth++;
		} else if (
			token.type === TT_RIGHT_PARENTHESIS ||
			token.type === TT_RIGHT_SQUARE_BRACKET
		) {
			depth--;
		} else if (token.type === TT_COMMA && depth === 0) {
			out.push(list.slice(from, token.start).trim());
			from = token.end;
		}
	}
	out.push(list.slice(from).trim());
	return out;
};

// CSS Modules' own pseudos, which webpack resolves before any printer reads the
// selector, so a stylesheet that still holds one is a fixture of that syntax.
const CSS_MODULES_RE = /:(?:global|local|export|import)\b/i;

/**
 * The pseudo-classes and pseudo-elements a selector names, at any depth, each
 * as its lowercased spelling with its colons.
 * @param {string} selector one complex selector
 * @returns {string[]} each pseudo, in order
 */
const pseudosOf = (selector) => {
	if (CSS_MODULES_RE.test(selector)) return [];
	/** @type {string[]} */
	const out = [];
	const stream = new TokenStream(selector);
	let colons = 0;
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		if (token.type === TT_COLON) {
			colons++;
			continue;
		}
		if (colons !== 0) {
			if (token.type === TT_IDENTIFIER) {
				out.push(
					":".repeat(colons) +
						selector.slice(token.start, token.end).toLowerCase()
				);
			} else if (token.type === TT_FUNCTION) {
				out.push(
					":".repeat(colons) +
						selector.slice(token.start, token.end - 1).toLowerCase()
				);
			}
		}
		colons = 0;
	}
	return out;
};

/**
 * The arguments of each call to one pseudo-class a selector makes, as written.
 * @param {string} selector one complex selector
 * @param {string} name the pseudo-class, lowercased and without its colon
 * @returns {string[]} each call's arguments
 */
const pseudoArguments = (selector, name) => {
	/** @type {string[]} */
	const out = [];
	const re = new RegExp(`:${name}\\(`, "gi");
	let match;
	while ((match = re.exec(selector)) !== null) {
		let depth = 1;
		let at = match.index + match[0].length;
		const from = at;
		for (; at < selector.length && depth !== 0; at++) {
			if (selector[at] === "(") depth++;
			else if (selector[at] === ")") depth--;
		}
		out.push(selector.slice(from, at - 1));
	}
	return out;
};

/**
 * The value's top-level components, split at whitespace, with each function
 * call kept whole.
 * @param {string} value a declaration's value
 * @returns {{ type: number, text: string }[]} each component
 */
const componentsOf = (value) => {
	/** @type {{ type: number, text: string }[]} */
	const out = [];
	const stream = new TokenStream(value);
	let depth = 0;
	let from = -1;
	let head = 0;
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		if (depth === 0) {
			if (token.type === TT_WHITESPACE) continue;
			from = token.start;
			head = token.type;
		}
		if (
			token.type === TT_FUNCTION ||
			token.type === TT_LEFT_PARENTHESIS ||
			token.type === TT_LEFT_SQUARE_BRACKET
		) {
			depth++;
		} else if (
			token.type === TT_RIGHT_PARENTHESIS ||
			token.type === TT_RIGHT_SQUARE_BRACKET
		) {
			depth--;
		}
		if (depth === 0) {
			out.push({ type: head, text: value.slice(from, token.end) });
		}
	}
	return out;
};

/**
 * Every function a value calls, at any depth, lowercased, and every identifier.
 * @param {string} value a declaration's value
 * @returns {{ functions: string[], identifiers: string[], hashes: string[] }} what it names
 */
const namesOf = (value) => {
	/** @type {string[]} */
	const functions = [];
	/** @type {string[]} */
	const identifiers = [];
	/** @type {string[]} */
	const hashes = [];
	const stream = new TokenStream(value);
	for (;;) {
		const token = stream.consume();
		if (token.type === TT_EOF) break;
		const text = value.slice(token.start, token.end);
		if (token.type === TT_FUNCTION) {
			functions.push(text.slice(0, -1).toLowerCase());
		} else if (token.type === TT_IDENTIFIER) {
			identifiers.push(text.toLowerCase());
		} else if (token.type === TT_HASH) {
			hashes.push(text);
		}
	}
	return { functions, identifiers, hashes };
};

/**
 * The arguments of each gradient a value calls, split at their commas.
 * @param {string} value a declaration's value
 * @returns {string[][]} per gradient, each comma-separated argument
 */
const gradientArguments = (value) => {
	/** @type {string[][]} */
	const out = [];
	const re =
		/(?:^|[^-\w])(?:-[a-z]+-)?(?:repeating-)?(?:linear|radial|conic)-gradient\(/gi;
	let match;
	while ((match = re.exec(value)) !== null) {
		let depth = 1;
		let at = match.index + match[0].length;
		const from = at;
		for (; at < value.length && depth !== 0; at++) {
			if (value[at] === "(") depth++;
			else if (value[at] === ")") depth--;
		}
		out.push(splitList(value.slice(from, at - 1)));
	}
	return out;
};

// The token types a length, a percentage or a unitless zero is.
const LENGTH_TYPES = new Set([TT_DIMENSION, TT_PERCENTAGE, TT_NUMBER]);

/**
 * Whether one gradient argument is a color stop with two positions.
 * @param {string} stop one comma-separated argument
 * @returns {boolean} true when it names a color and two positions
 */
const isDoubleStop = (stop) => {
	const parts = componentsOf(stop);
	if (parts.length !== 3) return false;
	let lengths = 0;
	for (const part of parts) {
		if (part.type === TT_IDENTIFIER && /^(?:at|to|from|in)$/i.test(part.text)) {
			return false;
		}
		if (LENGTH_TYPES.has(part.type)) lengths++;
		else if (part.type === TT_FUNCTION && /^calc\(/i.test(part.text)) lengths++;
	}
	return lengths === 2;
};

// The color functions each `SUPPORTED_FROM` feature stands for.
/** @type {Map<string, string>} */
const COLOR_FUNCTION_FEATURES = new Map([
	["hwb", "hwbColors"],
	["lab", "labColors"],
	["lch", "labColors"],
	["oklab", "oklabColors"],
	["oklch", "oklabColors"],
	["color", "colorFunction"],
	["color-mix", "colorMix"],
	["light-dark", "lightDark"]
]);

// The properties a two-value `display` or `overflow` belongs to.
const TWO_VALUE_FEATURES = new Map([
	["display", "displayTwoValues"],
	["overflow", "overflowTwoValues"]
]);

/**
 * What one declaration asks of a browser, as the constructs it names: each
 * `feature:` a `SUPPORTED_FROM` key, each `value:` a `VALUE_SUPPORT_PACKED` one.
 * @param {Declaration} declaration the declaration
 * @returns {Set<string>} the constructs
 */
const declarationConstructs = (declaration) => {
	/** @type {Set<string>} */
	const out = new Set();
	const { property } = declaration;
	// A custom property is kept as authored and read where `var()` puts it.
	if (property.startsWith("--")) return out;
	const value = declaration.value.replace(/!\s*important\s*$/i, "").trim();
	const { functions, identifiers, hashes } = namesOf(value);
	for (const fn of functions) {
		const feature = COLOR_FUNCTION_FEATURES.get(fn);
		if (feature !== undefined) out.add(`feature:${feature}`);
		if (valueProfile(fn) !== undefined) out.add(`value:${fn}`);
	}
	for (const identifier of identifiers) {
		if (valueProfile(`${property} ${identifier}`) !== undefined) {
			out.add(`value:${property} ${identifier}`);
		}
	}
	for (const hash of hashes) {
		if (/^#(?:[\da-f]{4}|[\da-f]{8})$/i.test(hash)) {
			out.add("feature:colorHexAlpha");
		}
	}
	if (
		(property === "font" || property === "font-family") &&
		identifiers.includes("system-ui")
	) {
		out.add("feature:systemUiFont");
	}
	const twoValue = TWO_VALUE_FEATURES.get(property);
	if (twoValue !== undefined && componentsOf(value).length === 2) {
		out.add(`feature:${twoValue}`);
	}
	if (/^inset(?:-block|-inline)?$/.test(property)) {
		out.add("feature:insetShorthand");
	}
	if (/^place-(?:content|items|self)$/.test(property)) {
		out.add("feature:placeShorthand");
	}
	if (property === "text-decoration-thickness") {
		out.add("feature:textDecorationThickness");
	}
	if (property === "text-decoration") {
		const parts = componentsOf(value);
		if (parts.length > 1) out.add("feature:textDecorationColorStyle");
		if (
			parts.some(
				(part) =>
					LENGTH_TYPES.has(part.type) ||
					/^(?:from-font|calc\()/i.test(part.text)
			)
		) {
			out.add("feature:textDecorationThickness");
		}
	}
	for (const stops of gradientArguments(value)) {
		if (stops.some(isDoubleStop)) out.add("feature:gradientDoublePosition");
	}
	return out;
};

/**
 * What one rule's prelude asks of a browser, as `declarationConstructs` names
 * constructs, with each pseudo as `pseudo:` its spelling.
 * @param {Rule} rule the rule
 * @returns {Set<string>} the constructs
 */
const ruleConstructs = (rule) => {
	/** @type {Set<string>} */
	const out = new Set();
	if (rule.kind === "style") {
		for (const selector of rule.selectors) {
			for (const pseudo of pseudosOf(selector)) out.add(`pseudo:${pseudo}`);
			for (const args of pseudoArguments(selector, "not")) {
				if (splitList(args).length > 1 || /[\s>+~]/.test(args.trim())) {
					out.add("feature:notSelectorList");
				}
			}
			for (const args of pseudoArguments(selector, "lang")) {
				if (splitList(args).length > 1) out.add("feature:langArgumentList");
			}
		}
	} else if (rule.kind === "at") {
		if (rule.name === "custom-media") out.add("feature:customMedia");
		if (rule.name === "media") {
			if (/\(\s*--/.test(rule.prelude)) out.add("feature:customMedia");
			if (/[<>=]/.test(rule.prelude)) out.add("feature:mediaQueryRange");
		}
	}
	if (rule.nested && rule.kind !== "invalid") out.add("feature:nesting");
	return out;
};

/**
 * Every construct a stylesheet asks a browser for.
 * @param {Sheet} sheet the stylesheet
 * @returns {Map<string, string>} each construct, to the first text naming it
 */
const sheetConstructs = (sheet) => {
	/** @type {Map<string, string>} */
	const out = new Map();
	for (const rule of sheet.rules) {
		for (const construct of ruleConstructs(rule)) {
			if (!out.has(construct)) out.set(construct, rule.prelude);
		}
	}
	for (const declaration of sheet.declarations) {
		for (const construct of declarationConstructs(declaration)) {
			if (!out.has(construct)) out.set(construct, declaration.text);
		}
	}
	return out;
};

/**
 * Whether one browser reads one construct `sheetConstructs` named.
 * @param {Browser} browser the browser
 * @param {string} construct the construct
 * @returns {boolean | undefined} whether it does, undefined where no table says
 */
const readsConstruct = (browser, construct) => {
	const colon = construct.indexOf(":");
	const kind = construct.slice(0, colon);
	const what = construct.slice(colon + 1);
	if (kind === "feature") return readsFeature(browser, what);
	if (kind === "pseudo") return readsPseudo(browser, what);
	const profile = valueProfile(what);
	return profile === undefined ? undefined : readsProfile(browser, profile);
};

/**
 * Whether one browser reads any keyword of one property the table names, which
 * is where it reads the property at all.
 * @param {Browser} browser the browser
 * @param {string} property the property
 * @returns {boolean} true when it reads one of them
 */
const readsSomeValue = (browser, property) => {
	valueProfile("");
	for (const [key, profile] of /** @type {Map<string, number>} */ (
		_valueSupport
	)) {
		if (key.startsWith(`${property} `) && readsProfile(browser, profile)) {
			return true;
		}
	}
	return false;
};

// A construct spelled for one engine: `pseudo::-webkit-autofill`,
// `value:display -webkit-box`.
const VENDOR_CONSTRUCT_RE = /^(?:pseudo:::?|value:(?:[-\w]+ )?)-[a-z]+-/;

// A value no table says who reads.
const CSS_WIDE_RE =
	/^\s*(?:initial|unset|revert|revert-layer)\s*(?:!\s*important\s*)?$/i;

/**
 * Whether a declaration a browser cannot read takes from it what the source
 * gave it: the source said the property — or its shorthand, or its longhands —
 * in a way that browser read. Where it read none of them, nothing was lost.
 * @param {Sheet} before the source
 * @param {string} property the property the output declares
 * @param {string} construct what in it the browser does not read
 * @param {Browser} browser the browser
 * @returns {boolean} true when it cost the browser something
 */
const lostFrom = (before, property, construct, browser) => {
	// A browser reading none of the property's keywords reads no value of it.
	if (construct.startsWith("value:") && !readsSomeValue(browser, property)) {
		return false;
	}
	let related = 0;
	for (const declaration of before.declarations) {
		const other = declaration.property;
		if (
			other !== property &&
			!other.startsWith(`${property}-`) &&
			!property.startsWith(`${other}-`)
		) {
			continue;
		}
		related++;
		// No table says who reads a CSS-wide keyword, so it answers for no one.
		if (CSS_WIDE_RE.test(declaration.value)) continue;
		let read = true;
		for (const one of declarationConstructs(declaration)) {
			if (readsConstruct(browser, one) === false) read = false;
		}
		if (read) return true;
	}
	return related === 0;
};

/**
 * Whether one browser reads a whole complex selector. One pseudo it does not
 * read is the selector gone, and in a list, the rule.
 * @param {Browser} browser the browser
 * @param {string} selector the selector
 * @returns {string | null} the first pseudo it does not read, or null
 */
const unreadPseudo = (browser, selector) => {
	for (const pseudo of pseudosOf(selector)) {
		if (!readsPseudo(browser, pseudo)) return pseudo;
	}
	return null;
};

// Each vendor spelling of a pseudo, back to the pseudo it spells.
/** @type {Map<string, string>} */
const UNPREFIXED_PSEUDO = new Map();
for (const [pseudo, spellings] of PREFIXED_SELECTORS) {
	for (const [spelling] of spellings) UNPREFIXED_PSEUDO.set(spelling, pseudo);
}

// CSS 2's pseudo-elements, which one colon spells as well as two.
const LEGACY_PSEUDO_ELEMENTS = new Set([
	"after",
	"before",
	"first-letter",
	"first-line"
]);

/**
 * A selector compared by what it says: whitespace around a combinator is no
 * part of it, nor an implied `*`, and a pseudo's vendor spelling says the pseudo.
 * @param {string} selector one complex selector
 * @returns {string} its comparable form
 */
const selectorKey = (selector) =>
	selector
		.replace(/\s+/g, " ")
		.replace(/\s*([>+~,()])\s*/g, "$1")
		.replace(/(^|[\s>+~(,])\*(?=[.#[:])/g, "$1")
		.replace(/["']/g, "")
		.replace(/(::?)([-\w]+)/g, (_match, colons, name) => {
			const lower = name.toLowerCase();
			const pseudo = UNPREFIXED_PSEUDO.get(lower) || lower;
			return (LEGACY_PSEUDO_ELEMENTS.has(pseudo) ? "::" : colons) + pseudo;
		})
		.trim();

/**
 * The lowerings the printer states it makes for a target, each with the
 * construct it leaves none of. A lowering the printer declines for want of a
 * spelling to write it as is not stated for that target.
 * @param {Browser[]} browsers the target
 * @returns {{ construct: string, name: string }[]} the lowerings
 */
const statedLowerings = (browsers) => {
	const all = (/** @type {string} */ feature) =>
		browsers.every((browser) => readsFeature(browser, feature));
	/** @type {{ construct: string, name: string }[]} */
	const out = [];
	if (!all("nesting") && all("isSelector")) {
		out.push({ construct: "feature:nesting", name: "nesting" });
	}
	if (!all("lightDark") && all("whereSelector")) {
		out.push({ construct: "feature:lightDark", name: "`light-dark()`" });
	}
	if (!all("notSelectorList") && all("isSelector")) {
		out.push({ construct: "feature:notSelectorList", name: "a `:not()` list" });
	}
	if (!all("langArgumentList") && all("isSelector")) {
		out.push({
			construct: "feature:langArgumentList",
			name: "a `:lang()` list"
		});
	}
	if (!all("mediaQueryRange")) {
		out.push({ construct: "feature:mediaQueryRange", name: "a media range" });
	}
	if (!all("textDecorationColorStyle")) {
		out.push({
			construct: "feature:textDecorationColorStyle",
			name: "a `text-decoration` shorthand"
		});
	}
	return out;
};

/**
 * What a rule a lowering left is, which is what names the reason it stayed: an
 * at-rule the lowering does not take a rule out of, a rule a declaration follows.
 * @param {Sheet} after the output the rule is in
 * @param {Rule} rule the rule still carrying the construct
 * @param {string} construct the construct
 * @returns {string} its shape
 */
const ruleShape = (after, rule, construct) => {
	if (construct === "feature:mediaQueryRange") {
		return /[<>](?!=)/.test(rule.prelude)
			? "with a strict bound"
			: "with an inclusive bound";
	}
	if (construct !== "feature:nesting") return "in a selector";
	if (rule.kind === "at") return "as an at-rule written in a style rule";
	/** @type {Rule | null} */
	let holder = rule.parent;
	while (holder !== null && holder.kind !== "style") holder = holder.parent;
	if (holder !== null && rule.parent !== holder) {
		return "as a rule an at-rule in a style rule holds";
	}
	if (
		holder !== null &&
		holder.declarations.some((declaration) => declaration.order > rule.order)
	) {
		return "as a rule a declaration follows";
	}
	if (
		holder !== null &&
		after.rules.some(
			(one) =>
				one.parent === holder &&
				one.kind === "at" &&
				holder.declarations.some((declaration) => declaration.order > one.order)
		)
	) {
		return "as a rule after an at-rule a declaration follows";
	}
	// A prefix copy and the rule it copies stand side by side, and stay together.
	if (
		after.rules.some(
			(one) =>
				one.parent === rule.parent &&
				one.selectors.some((selector) => /::?-[a-z]+-/i.test(selector))
		)
	) {
		return "as a rule a vendor prefix rewrote";
	}
	return "as a rule";
};

/**
 * @param {string} text what to show
 * @param {number} width at most this many characters
 * @returns {string} it on one line, cut to the width
 */
const oneLine = (text, width) => {
	const line = text.replace(/\s+/g, " ").trim();
	return line.length <= width ? line : `${line.slice(0, width - 1)}…`;
};

/**
 * Hold what the printer wrote for a target to what that target reads. Three
 * things are owed: nothing the source did not already ask for that a browser
 * cannot read, no list joined around a selector one drops, no stated lowering
 * left undone.
 * @param {object} input what to hold
 * @param {string} input.source the stylesheet the printer was handed
 * @param {string} input.printed what it wrote for the target
 * @param {readonly string[]} input.browsers the target's browserslist selection
 * @param {((css: string) => string)=} input.print the printer under that target, to narrow each repro with
 * @returns {Report[]} what the target does not read
 */
const readability = ({ source, printed, browsers, print }) => {
	const reports = holdReadable(source, printed, browsers);
	return print === undefined || reports.length === 0
		? reports
		: localize(source, print, browsers, reports);
};

/**
 * Each finding's repro narrowed to the one top-level construct of the source
 * that shows it printed alone, where one does; a join of two keeps the output.
 * @param {string} source the stylesheet
 * @param {(css: string) => string} print the printer, under the target's options
 * @param {readonly string[]} browsers the target
 * @param {Report[]} reports what the whole stylesheet showed
 * @returns {Report[]} the same findings, each with the smallest repro found
 */
const localize = (source, print, browsers, reports) => {
	/** @type {Map<string, string>} */
	const narrowed = new Map();
	for (const rule of readSheet(source).rules) {
		if (rule.parent !== null) continue;
		if (narrowed.size === reports.length) break;
		/** @type {string} */
		let out;
		try {
			out = print(rule.text);
		} catch (_error) {
			continue;
		}
		for (const found of holdReadable(rule.text, out, browsers)) {
			if (narrowed.has(found.what)) continue;
			if (!reports.some((report) => report.what === found.what)) continue;
			narrowed.set(
				found.what,
				`    ${oneLine(rule.text, 76)}\n      -> ${oneLine(out, 76)}`
			);
		}
	}
	return reports.map((report) => {
		const repro = narrowed.get(report.what);
		return repro === undefined ? report : { ...report, repro };
	});
};

/**
 * The relation's findings for one printed stylesheet, each with its repro read
 * off the output.
 * @param {string} source the stylesheet the printer was handed
 * @param {string} printed what it wrote for the target
 * @param {readonly string[]} browsers the target's browserslist selection
 * @returns {Report[]} what the target does not read
 */
const holdReadable = (source, printed, browsers) => {
	const target = targetBrowsers(browsers);
	if (target.length === 0) return [];
	const before = readSheet(source);
	const after = readSheet(printed);
	const asked = sheetConstructs(before);
	const written = sheetConstructs(after);
	/** @type {Report[]} */
	const reports = [];
	/** @type {Set<string>} */
	const said = new Set();
	/**
	 * @param {string} what what broke
	 * @param {string} repro where
	 */
	const report = (what, repro) => {
		const key = `${what}\n${repro}`;
		if (said.has(key)) return;
		said.add(key);
		reports.push({
			relation: "readable",
			what,
			repro: `    ${oneLine(repro, 76)}`
		});
	};
	// 1. What the printer reached for on its own. A vendor spelling is written
	// for the browsers that need it and skipped by the rest, which costs nothing.
	for (const rule of after.rules) {
		for (const construct of ruleConstructs(rule)) {
			if (asked.has(construct) || VENDOR_CONSTRUCT_RE.test(construct)) continue;
			const browser = target.find(
				(one) => readsConstruct(one, construct) === false
			);
			if (browser === undefined) continue;
			report(
				`wrote ${construct}, which ${browser.name} does not read`,
				rule.prelude
			);
		}
	}
	for (const declaration of after.declarations) {
		for (const construct of declarationConstructs(declaration)) {
			if (asked.has(construct) || VENDOR_CONSTRUCT_RE.test(construct)) continue;
			const browser = target.find(
				(one) =>
					readsConstruct(one, construct) === false &&
					lostFrom(before, declaration.property, construct, one)
			);
			if (browser === undefined) continue;
			report(
				`wrote ${construct}, which ${browser.name} does not read`,
				declaration.text
			);
		}
	}
	// 2. A list the printer made, around a selector one browser drops. A list
	// the source wrote is the author's, wherever the printer wrote it out.
	/** @type {Set<string>} */
	const topLevel = new Set();
	for (const rule of before.rules) {
		if (rule.kind !== "style" || rule.nested) continue;
		for (const selector of rule.selectors) topLevel.add(selectorKey(selector));
	}
	/** @type {string[][]} */
	const sourceLists = [];
	for (const rule of before.rules) {
		if (rule.kind !== "style" || rule.selectors.length < 2) continue;
		sourceLists.push(
			rule.selectors.map((one) => selectorKey(one.replace(/^&/, "")))
		);
	}
	/**
	 * @param {string} one a selector the output lists
	 * @param {string} other another in the same list
	 * @returns {boolean} true when a source list held both
	 */
	const listedTogether = (one, other) => {
		const a = selectorKey(one);
		const b = selectorKey(other);
		return sourceLists.some(
			(list) =>
				list.some((member) => a.endsWith(member)) &&
				list.some((member) => b.endsWith(member))
		);
	};
	for (const rule of after.rules) {
		if (rule.kind !== "style" || rule.selectors.length < 2) continue;
		for (const browser of target) {
			const dropped = rule.selectors.find(
				(selector) => unreadPseudo(browser, selector) !== null
			);
			if (dropped === undefined) continue;
			const kept = rule.selectors.find(
				(selector) =>
					unreadPseudo(browser, selector) === null &&
					!listedTogether(dropped, selector)
			);
			if (kept === undefined) continue;
			// A selector the source wrote at top level was merged there; any other
			// the printer resolved from a nested one on the way out.
			const how = topLevel.has(selectorKey(dropped))
				? "merging rules"
				: /::?-[a-z]+-/i.test(dropped)
					? "hoisting a prefix copy"
					: "hoisting nested rules";
			report(
				`${how} joined \`${dropped}\` into a list, which ${browser.name} drops whole with \`${kept}\``,
				rule.text
			);
			break;
		}
	}
	// 3. What the printer says it lowers, still there, named by what it is
	// written in — each a shape the lowering declines, or misses.
	for (const lowering of statedLowerings(target)) {
		if (!written.has(lowering.construct)) continue;
		/** @type {Set<string>} */
		const shapes = new Set();
		for (const rule of after.rules) {
			if (!ruleConstructs(rule).has(lowering.construct)) continue;
			const shape = ruleShape(after, rule, lowering.construct);
			if (shapes.has(shape)) continue;
			shapes.add(shape);
			report(
				`left ${lowering.name} ${shape}, which a target without it cannot read`,
				rule.text
			);
		}
		for (const declaration of after.declarations) {
			if (!declarationConstructs(declaration).has(lowering.construct)) continue;
			const shape = /var\(/i.test(declaration.value)
				? "in a value `var()` substitutes"
				: "in a value";
			if (shapes.has(shape)) continue;
			shapes.add(shape);
			report(
				`left ${lowering.name} ${shape}, which a target without it cannot read`,
				declaration.text
			);
		}
	}
	return reports;
};

// What a functional pseudo is given in the generated sheet, where it takes one.
/** @type {Record<string, string>} */
const PSEUDO_ARGUMENT = {
	":active-view-transition-type": "(x)",
	":dir": "(rtl)",
	":has": "(a)",
	":host-context": "(a)",
	":is": "(a)",
	":lang": "(en)",
	":not": "(a)",
	":nth-child": "(1)",
	":nth-last-child": "(1)",
	":nth-last-of-type": "(1)",
	":nth-of-type": "(1)",
	":state": "(x)",
	":where": "(a)",
	"::highlight": "(x)",
	"::part": "(x)",
	"::picker": "(select)",
	"::slotted": "(a)"
};

// One declaration per gate `SUPPORTED_FROM` names, each in the spelling the
// printer rewrites into it or out of it; `nesting` and the selector gates are
// what the pseudos below are written in.
const GATED_DECLARATIONS = [
	"color:rgba(255,0,0,.5)",
	"color:#ff000080",
	"background:linear-gradient(red 0,red 50%,blue 50%,blue 100%)",
	"background:linear-gradient(red 0 50%,blue 50% 100%)",
	"display:inline flow-root",
	"display:block flex",
	"font-family:system-ui",
	"text-decoration-line:underline;text-decoration-style:dotted;text-decoration-color:red",
	"text-decoration:underline dotted red 2px",
	"text-decoration-line:underline;text-decoration-thickness:2px",
	"color:color(srgb 1 0 0)",
	"color:color-mix(in srgb,red,blue)",
	"color:hwb(0 0% 0%)",
	"color:lab(50% 40 59)",
	"color:lch(50% 40 59)",
	"color:oklab(60% .1 .1)",
	"color:oklch(60% .1 30)",
	"color:light-dark(red,blue)",
	"color:light-dark(var(--a),blue)",
	"top:0;right:0;bottom:0;left:0",
	"inset:0",
	"overflow-x:hidden;overflow-y:auto",
	"overflow:hidden auto",
	"align-items:center;justify-items:center",
	"place-items:center",
	"align-content:center;justify-content:center",
	"align-self:center;justify-self:center",
	"flex-grow:1;flex-shrink:1;flex-basis:auto",
	"text-wrap-mode:wrap;text-wrap-style:pretty",
	"text-align:initial"
];

// The at-rules a gate reads the prelude of.
const GATED_AT_RULES = [
	"@media (min-width:1px) and (max-width:2px){.m{top:0}}",
	"@media (1px<=width<=2px){.m{top:0}}",
	"@media (width<2px){.m{top:0}}",
	"@media (width>=2px){.m{top:0}}",
	"@custom-media --m (min-width:1px);@media (--m){.m{top:0}}"
];

/**
 * The stylesheets reaching every gate the printer reads a target through, built
 * from the tables themselves: each pseudo alone, in a list the printer could
 * join, and nested — beside a sibling it could join, before a declaration and
 * inside an at-rule — and each gated feature, alone and nested.
 * @returns {[string, string][]} `[name, css]`, one construct each
 */
const gateFixtures = () => {
	/** @type {Set<string>} */
	const pseudos = new Set(SELECTOR_SUPPORTED_FROM.keys());
	for (const [pseudo] of PREFIXED_SELECTORS) {
		if (!pseudos.has(`::${pseudo}`)) pseudos.add(`:${pseudo}`);
	}
	/** @type {[string, string][]} */
	const out = [];
	for (const pseudo of pseudos) {
		const p = pseudo + (PSEUDO_ARGUMENT[pseudo] || "");
		// Named by the pseudo rather than counted, so a table gaining a row moves
		// no other repro an expectation names.
		const n = pseudo.replace(/^:+/, "");
		for (const css of [
			`.a-${n}${p}{top:0}`,
			`.b-${n}${p}{top:0}.b-${n}:hover{top:0}`,
			`.c-${n},.c-${n}${p}{top:0}`,
			`.d-${n}{color:red;&${p}{top:0}}`,
			`.e-${n}{&:hover{top:0}&${p}{top:0}}`,
			`.f-${n}{& .x${p}{top:0}.y{top:0}}`,
			`.g-${n}{top:0;&${p}{top:0}left:0}`,
			`@media print{.h-${n}{&${p}{top:0}}}`,
			`.i-${n}{@media print{&${p}{top:0}}}`
		]) {
			out.push([pseudo, css]);
		}
	}
	for (const declaration of GATED_DECLARATIONS) {
		for (const css of [
			`.j{${declaration}}`,
			`.k{top:1px;&:hover{${declaration}}}`,
			`.l{${declaration};@media print{${declaration}}}`
		]) {
			out.push([declaration, css]);
		}
	}
	for (const css of [
		...GATED_AT_RULES,
		".n1,.n2{& .x{top:0}}",
		".n3 .n4{& .x{top:0}}",
		".n5:not(.a):not(.b){top:0}",
		".n6:not(.a,.b){top:0}",
		".n7:lang(en),.n7:lang(fr){top:0}",
		".n8:lang(en,fr){top:0}",
		".n9{top:0;@supports (display:grid){top:1px}}",
		".n10{top:0;@media print{top:1px;& .x{top:2px}}}",
		".n11{@media print{top:0}left:0;&:hover{top:0}}"
	]) {
		out.push(["at-rules and lists", css]);
	}
	return out;
};

module.exports = {
	gateFixtures,
	readSheet,
	readability,
	selectorKey,
	sheetConstructs,
	statedLowerings,
	targetBrowsers
};
