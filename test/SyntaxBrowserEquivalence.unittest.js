"use strict";

const fs = require("fs/promises");
const path = require("path");
const { SourceProcessor: CssSourceProcessor } = require("../lib/css/syntax");
const {
	EMPTY_REMOVABLE_ATTRIBUTES,
	ENUMERATED_KEYWORDS
} = require("../lib/html/data");
const { SourceProcessor: HtmlSourceProcessor } = require("../lib/html/syntax");
const launchChrome = require("./helpers/launchChrome");

// The minifiers claim their rewrites are equivalent *to the engine*, which only
// an engine can confirm: every `configCases` stylesheet and page is minified and
// both spellings are handed to Chromium, which must build the same document and
// compute the same style from each. Nothing here is snapshotted — the assertion
// is the equivalence itself, and the printers' output is snapshotted by the
// suites that test printing.
//
// Nothing is compared as text where the engine can be asked instead: an
// attribute value is read back through its IDL reflection, a declaration through
// its computed style, and an at-rule condition through what it answers at every
// viewport and container size that could tell two conditions apart. The one
// thing an engine cannot answer for is syntax it does not implement — a property
// Chromium drops is absent from both stylesheets, so "computes the same style"
// is undefined for it. Everything else is compared.

const CONFIG_CASES = path.join(__dirname, "configCases");

/** @typedef {{ name: string, raw: string, min: string }} Fixture */

/**
 * Every fixture of one extension under a directory.
 * @param {string} dir directory to walk
 * @param {string} extension file extension including the dot
 * @returns {Promise<string[]>} sorted fixture paths
 */
const collectFixtures = async (dir, extension) => {
	/** @type {string[]} */
	const files = [];
	/**
	 * @param {string} current directory to read
	 * @returns {Promise<void>} when the subtree has been read
	 */
	const walk = async (current) => {
		const entries = await fs.readdir(current, { withFileTypes: true });
		await Promise.all(
			entries.map(async (entry) => {
				const full = path.join(current, entry.name);
				if (entry.isDirectory()) await walk(full);
				else if (entry.name.endsWith(extension)) files.push(full);
			})
		);
	};
	await walk(dir);
	return files.sort();
};

/**
 * Load fixtures and minify each one on its own — concatenating first would let a
 * deliberately malformed page corrupt every fixture after it.
 * @param {string} extension file extension including the dot
 * @param {(source: string) => string} minify the printer to run
 * @returns {Promise<Fixture[]>} the corpus
 */
const buildCorpus = async (extension, minify) => {
	const files = await collectFixtures(CONFIG_CASES, extension);
	return Promise.all(
		files.map(async (file) => {
			const raw = await fs.readFile(file, "utf8");
			return {
				name: path
					.relative(path.join(__dirname, ".."), file)
					.replace(/\\/g, "/"),
				raw,
				min: minify(raw)
			};
		})
	);
};

/** @type {Fixture[]} */
let cssCorpus;
/** @type {Fixture[]} */
let htmlCorpus;
/** @type {Fixture[]} */
let htmlCorpusAllImpliedTags;
/** @type {Fixture[]} */
let htmlCorpusSmartTags;
/** @type {Promise<void> | undefined} */
let building;

/**
 * Build both corpora once, however many suites ask for them.
 * @returns {Promise<void>} when both are ready
 */
const buildCorpora = () => {
	if (building === undefined) {
		building = (async () => {
			cssCorpus = await buildCorpus(
				".css",
				(source) =>
					/** @type {{ code: string }} */
					(new CssSourceProcessor().process(source, { mode: "minify" })).code
			);
			// Read once, minified three ways: only the print options differ.
			const htmlSources = await buildCorpus(".html", (source) => source);
			/**
			 * @param {object} options extra print options
			 * @returns {Fixture[]} the corpus, minified with them
			 */
			const htmlVariant = (options) =>
				htmlSources.map((one) => ({
					...one,
					min: /** @type {{ code: string }} */ (
						new HtmlSourceProcessor().process(one.raw, {
							mode: "minify",
							...options
						})
					).code
				}));
			htmlCorpus = htmlVariant({});
			// `removeImpliedTags` leaves out a tag the parser puts back, so it is
			// the one option whose whole claim is that the DOM does not notice.
			htmlCorpusAllImpliedTags = htmlVariant({ removeImpliedTags: true });
			htmlCorpusSmartTags = htmlVariant({ removeImpliedTags: "smart" });
		})();
	}
	return building;
};

// Stylesheets the printer is known to get wrong. Each entry is a filed defect,
// not a tolerated one, and carries what the engine sees; the comparison below
// matches this set exactly, so an entry outlives its defect by exactly one run.
const FILED_CSS_DEFECTS = new Map([
	[
		"test/configCases/css/minimize-strings/style.css",
		"a bad-string stops swallowing the rules after it"
	],
	[
		"test/configCases/css/minimize-urls/style.css",
		"a bad-url stops swallowing the rules after it"
	],
	[
		"test/configCases/css/parsing/cases/bad-url-token.css",
		"a bad-url token stops swallowing the rules after it"
	],
	[
		// Not a printer defect: Chrome normalises an escaped custom property in a
		// declaration name but echoes the authored spelling inside `var()`, so the
		// shorter `\2d-two` the printer writes reads as different `cssText` from
		// `\2d\2d two` while naming the one property — both compute the same value.
		"test/configCases/css/escaped-names/style.module.css",
		"Chrome echoes the authored escape spelling inside `var()`"
	],
	[
		// Not a printer defect: Chrome drops `attr( name unit )` when a space sits
		// before the `)` and the type is a bare unit — `attr( name unit)`,
		// `attr(name  unit)`, `attr( name type(<length>) )` and `attr( name unit, )`
		// all parse. Trimming that space is right, and leaves the minified sheet
		// applying a declaration the engine threw away in the original.
		"test/configCases/css/minimize-lightningcss-values/style.css",
		"Chrome parses `attr( name unit )` and its trimmed form differently"
	]
]);

/**
 * @typedef {{ kind: string, condition: string }} Condition
 * @typedef {{ chain: Condition[], text: string, label?: string, list?: string[] }} Rule
 * @typedef {{ facets: Record<string, string[]>, styles: Rule[][] }} Facets
 */

/**
 * @typedef {object} PageHelpers
 * @property {(source: string) => Rule[] | null} cssRules the rules of a stylesheet, in cascade order
 * @property {(html: string) => Facets} htmlFacets everything a page's DOM is made of
 * @property {(conditions: string[], sizes: number[]) => string[]} containerSignatures which sizes each container query holds at
 * @property {(conditions: string[]) => string[]} supportsSignatures whether each support condition holds
 */

/**
 * Installed once into the page. Everything both suites need lives here so an
 * inline `<style>` is held to exactly the same standard as a `.css` file.
 * @returns {void}
 */
const installHelpers = () => {
	const NS_HTML = "http://www.w3.org/1999/xhtml";
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
				out += ch;
			}
		}
		if (quote !== "") out += JSON.stringify(string);
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
		// A color written into a value the engine cannot compute — a `var()`
		// fallback — is still a color, and `#ff0` is `rgb(255,255,0)`.
		out = out.replace(
			/#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/gi,
			(color) => painted(color)
		);
		return (
			out
				.replace(/ ?([,()*/]) ?/g, "$1")
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
	 * @returns {string[]} one entry per property it sets, unordered
	 */
	const computed = (declaration) => {
		probe.style.cssText = "";
		probe.style.cssText = declaration;
		// A declaration carrying `transition-*` animates the shared probe away from
		// the previous rule's value, and the computed style would be read in flight.
		for (const animation of probe.getAnimations()) animation.cancel();
		const style = getComputedStyle(probe);
		/** @type {string[]} */
		const out = [];
		for (const property of probe.style) {
			const specified = probe.style.getPropertyValue(property);
			const bang = probe.style.getPropertyPriority(property) === "" ? "" : "!";
			// A custom property is a token stream the engine keeps verbatim, so it is
			// compared as written too — the whitespace and comments between its
			// tokens say nothing once it is substituted.
			const written =
				property.startsWith("--") ||
				/(^|[^\w-])(?:var|env|attr)\(/.test(specified);
			const resolved = written
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
		 * A selector list in one order, a repeat dropped — it is a set. The splitter
		 * is spelled out again because this function is serialized into the page.
		 * @param {string} list a selector list
		 * @returns {string} its canonical spelling
		 */
		const selectorSet = (list) => {
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
			return [...new Set(out.map(oneSpelling))].sort().join(", ");
		};
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
		 * Each grouping rule builds its own chain, so two adjacent blocks of one
		 * condition hold equal chains that are not the same array.
		 * @param {Condition[]} one a chain
		 * @param {Condition[]} other another
		 * @returns {boolean} whether they are the same conditions
		 */
		const sameChain = (one, other) =>
			one.length === other.length &&
			one.every(
				(condition, at) =>
					condition.kind === other[at].kind &&
					conditionKey(condition) === conditionKey(other[at])
			);
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
					const label =
						(selector ? selectorSet(selector) : selector) ||
						/** @type {CSSKeyframeRule} */ (rule).keyText ||
						(rule.cssText.includes("{") ? prelude(rule) : "&");
					// The same selector twice in a row is the one rule the cascade reads,
					// which is what joining their blocks leaves.
					const previous = out[out.length - 1];
					const list = computed(style.cssText);
					if (
						previous !== undefined &&
						sameChain(previous.chain, chain) &&
						previous.label === label
					) {
						// Concatenate rather than resolve: only an identical pair
						// collapses, so no filed defect is hidden by the fold.
						const both = [
							...new Set([.../** @type {string[]} */ (previous.list), ...list])
						];
						previous.list = both;
						previous.text = `${label} { ${[...both].sort().join(";")} }`;
					} else {
						out.push({
							chain,
							label,
							list,
							text: `${label} { ${[...list].sort().join(";")} }`
						});
					}
				}
				if (nested) {
					walk(nested, [...chain, conditionOf(rule)]);
				} else if (!style) {
					// `@import`, `@namespace` and `@property` neither declare nor group,
					// so they are compared as written.
					out.push({ chain, text: rule.cssText });
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
			return raw
				.split(",")
				.map((one) => one.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, ""))
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
		const clone = /** @type {ParentNode & Node} */ (root.cloneNode(true));
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
		const doc = new DOMParser().parseFromString(html, "text/html");
		/** @type {Record<string, string[]>} */
		const facets = {
			elements: [],
			ownText: [],
			comments: [],
			scripts: [],
			templates: []
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
				const name =
					element.namespaceURI === NS_HTML ? element.localName : null;
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
				collect(element, depth + 1, inPage);
			}
		};
		collect(doc, 0, false);
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

	/** @type {{ __eq: PageHelpers }} */ (/** @type {unknown} */ (window)).__eq =
		{
			cssRules,
			htmlFacets,
			containerSignatures,
			supportsSignatures
		};
};

describe("printer output in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser} */
	let browser;
	/** @type {import("puppeteer-core").Page} */
	let page;

	beforeAll(async () => {
		await buildCorpora();
		// The whole corpus is compared in one call per language.
		browser = await launchChrome({ protocolTimeout: 300000 });
		page = await browser.newPage();
		await page.setContent(
			"<!doctype html><html><head></head><body></body></html>"
		);
		await page.evaluate(installHelpers);
	}, 300000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	/**
	 * What the engine makes of every at-rule condition in a set of rules. A
	 * condition is not compared as text: `(min-width: 200px)` and
	 * `(width >= 200px)` are one query written two ways, and the spec says so, so
	 * the engine is asked instead — a media query at every viewport that could
	 * tell two of them apart, a container query at every container size, a
	 * support condition outright. Two conditions that answer alike everywhere are
	 * the same condition.
	 * @param {Rule[][]} groups every rule list to be compared
	 * @returns {Promise<Map<string, string>>} condition to what the engine answers
	 */
	const conditionSignatures = async (groups) => {
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
					if (value > 0 && value < 10000) {
						edges
							.add(value - 1)
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
			return selectors.map((one) => ({ chain: rule.chain, text: one + block }));
		});

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
		// The same selector twice in a row computing the same style is the one rule
		// it resolves to, which is what joining them into a list leaves.
		/**
		 * @param {Rule[]} rules rules in cascade order
		 * @returns {string[]} their keys, an adjacent repeat collapsed
		 */
		const keys = (rules) => {
			const flat = perSelector(rules).map((rule) => ({
				key: keyOf(rule, signatures),
				// Everything but the selector: two entries sharing it are one rule's
				// worth of cascade, whichever of them is written first.
				group: keyOf(
					{ chain: rule.chain, text: blockOf(rule.text) },
					signatures
				)
			}));
			// A run of selectors reaching one block under one condition is the set a
			// join may write in any order, so it is compared in one order.
			for (let from = 0; from < flat.length;) {
				let to = from + 1;
				while (to < flat.length && flat[to].group === flat[from].group) to++;
				if (to - from > 1) {
					const sorted = flat
						.slice(from, to)
						.sort((one, other) => (one.key < other.key ? -1 : 1));
					for (let i = from; i < to; i++) flat[i] = sorted[i - from];
				}
				from = to;
			}
			return flat
				.map(({ key }) => key)
				.filter((key, i, all) => i === 0 || key !== all[i - 1]);
		};
		const a = keys(before);
		const b = keys(after);
		const shorter = Math.min(a.length, b.length);
		const at = a.slice(0, shorter).findIndex((key, i) => key !== b[i]);
		if (at !== -1) return `rule ${at}: ${a[at]} vs ${b[at]}`;
		if (a.length > b.length) return `rule dropped: ${a[shorter]}`;
		if (b.length > a.length) return `rule added: ${b[shorter]}`;
		return "";
	};

	it("should build the same DOM from a page and its minified form", async () => {
		const collected = await page.evaluate((cases) => {
			const { htmlFacets } = /** @type {{ __eq: PageHelpers }} */ (
				/** @type {unknown} */ (window)
			).__eq;
			return cases.map((one) => ({
				name: one.name,
				before: htmlFacets(one.raw),
				after: htmlFacets(one.min)
			}));
		}, htmlCorpus);
		const signatures = await conditionSignatures(
			collected.flatMap((one) => [...one.before.styles, ...one.after.styles])
		);
		/** @type {{ name: string, why: string }[]} */
		const differences = [];
		for (const { name, before, after } of collected) {
			let why = "";
			for (const facet of Object.keys(before.facets)) {
				const a = before.facets[facet];
				const b = after.facets[facet];
				// A comment renders nothing, so the minifier may drop one; the ones it
				// keeps must be unchanged and still in order.
				if (facet === "comments") {
					let from = 0;
					for (const comment of b) {
						const at = a.indexOf(comment, from);
						if (at === -1) {
							why = `comment is not one of the source's: ${comment}`;
							break;
						}
						from = at + 1;
					}
					if (why !== "") break;
					continue;
				}
				if (a.length !== b.length) {
					why = `${facet}: ${a.length} vs ${b.length}`;
					break;
				}
				const at = a.findIndex((entry, i) => entry !== b[i]);
				if (at !== -1) {
					why = `${facet} ${at}: ${a[at]} vs ${b[at]}`;
					break;
				}
			}
			if (why === "" && before.styles.length !== after.styles.length) {
				why = `styles: ${before.styles.length} vs ${after.styles.length}`;
			}
			for (let i = 0; why === "" && i < before.styles.length; i++) {
				const reason = compareRules(
					before.styles[i],
					after.styles[i],
					signatures
				);
				if (reason !== "") why = `style ${i}: ${reason}`;
			}
			if (why !== "") differences.push({ name, why });
		}
		// Every part of the document the engine builds — the element tree, the
		// rendered text, the comments, the doctype, and the CSS, JSON and script
		// bodies carried inside it — must survive minification unchanged.
		expect(differences).toEqual([]);
	}, 600000);

	it.each([
		["true", () => htmlCorpusAllImpliedTags],
		["smart", () => htmlCorpusSmartTags]
	])(
		"should build the same DOM with removeImpliedTags %s",
		async (_mode, corpus) => {
			const collected = await page.evaluate((cases) => {
				const { htmlFacets } = /** @type {{ __eq: PageHelpers }} */ (
					/** @type {unknown} */ (window)
				).__eq;
				return cases.map((one) => ({
					name: one.name,
					before: htmlFacets(one.raw).facets,
					after: htmlFacets(one.min).facets
				}));
			}, corpus());
			/** @type {{ name: string, why: string }[]} */
			const differences = [];
			for (const { name, before, after } of collected) {
				for (const facet of Object.keys(before)) {
					// A comment the minifier drops is dropped whatever the option says,
					// and the default-mode test above already holds it to that.
					if (facet === "comments") continue;
					const a = before[facet];
					const b = after[facet];
					if (a.length !== b.length) {
						differences.push({
							name,
							why: `${facet}: ${a.length} vs ${b.length}`
						});
						break;
					}
					const at = a.findIndex((entry, i) => entry !== b[i]);
					if (at !== -1) {
						differences.push({
							name,
							why: `${facet} ${at}: ${a[at]} vs ${b[at]}`
						});
						break;
					}
				}
			}
			// The tags this leaves out are the ones the parser puts back, so the tree
			// it builds — and every element's depth in it — must be untouched.
			expect(differences).toEqual([]);
		},
		600000
	);

	it("should only fold enumerated values the engine folds too", async () => {
		// The printer lower-cases a value in `ENUMERATED_KEYWORDS`. That is
		// unobservable exactly where the IDL member is "limited to only known
		// values", so it hands back one spelling whichever was written — which no
		// dataset states, and `target` / `<textarea wrap>` reflect verbatim. The
		// corpus only covers the entries a fixture happens to carry; this covers
		// every one of them.
		/** @type {Record<string, Record<string, string[]>>} */
		const table = {};
		for (const [element, attributes] of Object.entries(ENUMERATED_KEYWORDS)) {
			table[element] = {};
			for (const [attribute, keywords] of Object.entries(attributes)) {
				table[element][attribute] = [...keywords];
			}
		}
		const unfolded = await page.evaluate((cases) => {
			/**
			 * @param {string} element tag name
			 * @param {string} attribute attribute name
			 * @param {string} value the value to set
			 * @returns {[string | undefined, unknown]} the IDL member and what it reads back
			 */
			const readBack = (element, attribute, value) => {
				const node = document.createElement(element);
				node.setAttribute(attribute, value);
				document.body.append(node);
				/** @type {string | undefined} */
				let property;
				for (
					let proto = Object.getPrototypeOf(node);
					proto !== null && property === undefined;
					proto = Object.getPrototypeOf(proto)
				) {
					for (const name of Object.getOwnPropertyNames(proto)) {
						if (name.toLowerCase() === attribute) {
							property = name;
							break;
						}
					}
				}
				const reflected =
					property === undefined
						? undefined
						: /** @type {Record<string, unknown>} */ (
								/** @type {unknown} */ (node)
							)[property];
				node.remove();
				return [property, reflected];
			};
			/** @type {string[]} */
			const out = [];
			for (const [element, attributes] of Object.entries(cases)) {
				for (const [attribute, keywords] of Object.entries(attributes)) {
					for (const keyword of keywords) {
						// A keyword with no lower case to fold cannot be respelled.
						if (keyword === keyword.toUpperCase()) continue;
						// A global attribute is read on an element that reflects it; one
						// no element does (`referrerpolicy` on a `<div>`) is inert there.
						const on = element === "*" ? "a" : element;
						const [property, folded] = readBack(on, attribute, keyword);
						if (property === undefined) continue;
						const [, written] = readBack(on, attribute, keyword.toUpperCase());
						if (written !== folded) {
							out.push(
								`${element} ${attribute}=${keyword}: ${JSON.stringify(
									written
								)} vs ${JSON.stringify(folded)}`
							);
						}
					}
				}
			}
			return out;
		}, table);
		expect(unfolded).toEqual([]);
	}, 600000);

	it("should only drop an empty attribute the engine reads back as absent", async () => {
		// `removeEmptyAttributes` drops each of these when its value is empty. That
		// is unobservable only where the IDL member reads the same as with no
		// attribute at all — which is why an event handler is not in the table:
		// an empty body still compiles, so it reads back a function, not null.
		// A global is read on `<a>`, as every one of them was before the table
		// carried a scope; a scoped one on each element it names.
		/** @type {[string, string[]][]} */
		const probes = [];
		for (const [name, on] of EMPTY_REMOVABLE_ATTRIBUTES) {
			probes.push([name, on === null ? ["a"] : [...on]]);
		}
		const observable = await page.evaluate((pairs) => {
			/**
			 * @param {string} tagName the element to read it on
			 * @param {string} attribute the attribute name
			 * @param {boolean} set whether to give it the empty value
			 * @returns {[string | undefined, unknown]} the IDL member and its value
			 */
			const readBack = (tagName, attribute, set) => {
				// Read on an element the spec defines it for, so a scoped attribute
				// is probed where it means something rather than skipped as unknown.
				const node = document.createElement(tagName);
				if (set) node.setAttribute(attribute, "");
				document.body.append(node);
				/** @type {string | undefined} */
				let property;
				for (
					let proto = Object.getPrototypeOf(node);
					proto !== null && property === undefined;
					proto = Object.getPrototypeOf(proto)
				) {
					for (const name of Object.getOwnPropertyNames(proto)) {
						if (name.toLowerCase() === attribute) {
							property = name;
							break;
						}
					}
				}
				const reflected =
					property === undefined
						? undefined
						: /** @type {Record<string, unknown>} */ (
								/** @type {unknown} */ (node)
							)[property];
				node.remove();
				return [property, String(reflected)];
			};
			/** @type {string[]} */
			const out = [];
			for (const [name, elements] of pairs) {
				for (const tagName of elements) {
					const [property, empty] = readBack(tagName, name, true);
					if (property === undefined) continue;
					const [, absent] = readBack(tagName, name, false);
					if (empty !== absent) {
						out.push(`${tagName}[${name}]: ${empty} vs ${absent}`);
					}
				}
			}
			return out;
		}, probes);
		expect(observable).toEqual([]);
	}, 600000);

	it("should build the same CSSOM from a stylesheet and its minified form", async () => {
		const collected = await page.evaluate((cases) => {
			const { cssRules } = /** @type {{ __eq: PageHelpers }} */ (
				/** @type {unknown} */ (window)
			).__eq;
			return cases.map((one) => ({
				name: one.name,
				before: cssRules(one.raw),
				after: cssRules(one.min)
			}));
		}, cssCorpus);
		const signatures = await conditionSignatures(
			collected.flatMap((one) => [one.before || [], one.after || []])
		);
		/** @type {{ name: string, why: string }[]} */
		const differences = [];
		for (const { name, before, after } of collected) {
			if (before === null || after === null) {
				differences.push({ name, why: "stylesheet did not parse" });
				continue;
			}
			const why = compareRules(before, after, signatures);
			if (why !== "") differences.push({ name, why });
		}
		// The same rules, in the same cascade order, under conditions the engine
		// answers alike, each computing to the same style — except where the
		// printer is known to be wrong and the defect is filed. The comparison is
		// exact in both directions: a new difference fails, and so does a filed one
		// that has been fixed, which is what takes its entry back out of here.
		expect(differences.map((one) => one.name).sort()).toEqual(
			[...FILED_CSS_DEFECTS.keys()].sort()
		);
	}, 600000);
});
