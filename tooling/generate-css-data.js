/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Generate `lib/css/data.js` — every table the CSS minifier looks a name up in
// that some published dataset already states — from `mdn-data` (the property and
// value-syntax database) and `color-name` (the named-color byte values).
//
//   node tooling/generate-css-data.js --write
//
// `yarn fix:special` writes it; `yarn lint:special` runs the same generator
// without `--write` and fails when the checked-in file no longer matches, so a
// data-package bump lands as a reviewable diff rather than as silent drift.
//
// Tables no dataset states are the `SUPPLEMENT` below — spec prose spelled out,
// each entry with the reason it is not derivable. They are emitted from here
// too, so every table the minifier looks a name up in lives in one file and
// `lib/css/syntax.js` stays algorithm.

const fs = require("fs");
const path = require("path");
const colorName = require("color-name");
/** @typedef {{ version: string }} PackageManifest */
/** @typedef {{ [name: string]: { syntax: string } }} SyntaxTable */
/** @type {PackageManifest} */
const colorNamePackage = require("color-name/package.json");
/** @type {SyntaxTable} */
const functions = require("mdn-data/css/functions.json");
/** @type {{ [name: string]: { syntax?: string, status?: string, computed?: string | string[] } }} */
const properties = require("mdn-data/css/properties.json");
/** @type {SyntaxTable} */
const syntaxes = require("mdn-data/css/syntaxes.json");
/** @type {PackageManifest} */
const mdnDataPackage = require("mdn-data/package.json");
const prettier = require("prettier");

const TARGET = path.resolve(__dirname, "../lib/css/data.js");
const write = process.argv.includes("--write");

// The `{1,4}` value-definition notation is CSS's box notation: an omitted value
// is copied from the opposite side (4 -> top right bottom left, 3 -> top
// right/left bottom, 2 -> top/bottom right/left, 1 -> all). Every property that
// spells its syntax that way inherits the rule, so matching the notation is
// enough — no per-property knowledge is needed.
//
// `{1,2}` is deliberately not matched. It looks like the same shape but the
// omitted value is not always a copy: `text-overflow: clip ellipsis` means
// start/end, and collapsing `ellipsis ellipsis` to `ellipsis` would silently
// move the first value back to its `clip` default.
const BOX_NOTATION = /\{1,4\}/;

// `fill` may sit anywhere among the four values, so a positional collapse would
// count it as one of them.
const POSITIONAL_KEYWORD = /\bfill\b/;

// A second box after a `/` (only `border-radius` today). Everywhere else a `/`
// makes the declaration invalid, so the minifier must leave it alone rather than
// collapse it into something the browser would start honoring.
const SLASH_NOTATION = /\//;

/**
 * @param {boolean} withSlash whether to collect the properties taking a second `/` box
 * @returns {string[]} the matching `{1,4}` box-shorthand property names, sorted
 */
const collectBoxShorthands = (withSlash) => {
	/** @type {string[]} */
	const names = [];
	for (const [name, property] of Object.entries(properties)) {
		if (typeof property.syntax !== "string") continue;
		if (property.status !== "standard") continue;
		if (!BOX_NOTATION.test(property.syntax)) continue;
		if (POSITIONAL_KEYWORD.test(property.syntax)) continue;
		if (SLASH_NOTATION.test(property.syntax) !== withSlash) continue;
		names.push(name);
	}
	return names.sort();
};

// The box side a longhand covers, read off its name. `border-radius` and
// `corner-shape` are deliberately unmatched: their four longhands are corners
// (`top-left` …), which `{1,4}` orders differently.
const BOX_SIDES = ["top", "right", "bottom", "left"];

/**
 * The `{1,4}` box shorthands whose four longhands map onto the four sides, in
 * `top right bottom left` order. Merging four such longhands into the shorthand
 * sets exactly the same properties — nothing extra is reset.
 * @param {string[]} shorthands the box-shorthand property names
 * @returns {[string, string[]][]} `[shorthand, longhands]`, sorted
 */
const collectBoxLonghands = (shorthands) => {
	/** @type {[string, string[]][]} */
	const out = [];
	for (const name of shorthands) {
		const longhands = properties[name].computed;
		if (!Array.isArray(longhands) || longhands.length !== 4) continue;
		const sides = BOX_SIDES.map((side) =>
			longhands.find(
				(longhand) =>
					longhand === side ||
					longhand.includes(`-${side}-`) ||
					longhand.endsWith(`-${side}`)
			)
		);
		if (sides.includes(undefined)) continue;
		if (new Set(sides).size !== 4) continue;
		out.push([name, /** @type {string[]} */ (sides)]);
	}
	return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

// Every value-definition production, function ones included. `functions.json`
// and `syntaxes.json` overlap; `syntaxes.json` wins, as the more complete of the
// two for the productions they share.
/** @type {Map<string, string>} */
const definitions = new Map();
for (const [name, entry] of Object.entries(functions)) {
	definitions.set(name, entry.syntax);
}
for (const [name, entry] of Object.entries(syntaxes)) {
	definitions.set(name, entry.syntax);
}

/**
 * @param {string} syntax a value definition
 * @returns {string[]} the production names it references
 */
const references = (syntax) => {
	const found = syntax.match(/<[^>\s]+>/g);
	return found === null ? [] : found.map((name) => name.slice(1, -1));
};

/**
 * Whether a production can be a color without passing through a function of its
 * own. The minifier reads the hash's immediate parent, so a gradient nested in
 * `image-set()` is the gradient's business, not `image-set()`'s — which is why
 * the walk stops at every `name()` production.
 * @param {string} name a production name
 * @param {Set<string>} seen productions already on this path (the grammar is recursive)
 * @returns {boolean} true when a color is reachable
 */
const reachesColor = (name, seen) => {
	if (name === "color" || name === "color-base" || name === "hex-color") {
		return true;
	}
	if (name.endsWith("()") || seen.has(name)) return false;
	seen.add(name);
	const syntax = definitions.get(name);
	if (syntax === undefined) return false;
	return references(syntax).some((child) => reachesColor(child, seen));
};

/**
 * @returns {string[]} the functions that take a color argument directly, sorted
 */
const collectColorArgumentFunctions = () => {
	/** @type {string[]} */
	const names = [];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).some((child) => reachesColor(child, new Set()))) {
			names.push(name.slice(0, -2));
		}
	}
	return names.sort();
};

// Arbitrary substitution functions CSS Values 5 defines but `mdn-data` does not
// describe yet, so the derivation below cannot see them.
const EXTRA_SUBSTITUTION_FUNCTIONS = [
	"first-valid",
	"if",
	"inherit",
	"random-item"
];

/**
 * The functions that substitute an arbitrary token sequence, spotted by the
 * `<declaration-value>` in their own syntax — that production _is_ "any token
 * sequence". Over-inclusive by design: `paint()`'s trailing arguments are the
 * worklet's, not a substituted value, but declining a collapse only costs bytes.
 * @returns {string[]} the function names, sorted
 */
const collectSubstitutionFunctions = () => {
	const names = [...EXTRA_SUBSTITUTION_FUNCTIONS];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).includes("declaration-value")) {
			names.push(name.slice(0, -2));
		}
	}
	return names.sort();
};

// The productions that only a math expression is written with, so a function
// referencing one takes math expressions and nothing else.
const MATH_PRODUCTIONS = ["calc-sum", "calc-product", "calc-value"];

/**
 * CSS Values 4's math functions, spotted by the `<calc-sum>` in their own
 * syntax: inside one, everything is a math expression, so `*` and `/` there are
 * operators the whitespace around carries nothing for.
 * @returns {string[]} the function names, sorted
 */
const collectMathFunctions = () => {
	/** @type {string[]} */
	const names = [];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).some((child) => MATH_PRODUCTIONS.includes(child))) {
			names.push(name.slice(0, -2));
		}
	}
	return names.sort();
};

/**
 * @param {number[]} channels the `[r, g, b]` bytes
 * @returns {string} the shortest hex spelling — 3 digits when every byte is a repeated pair
 */
const hex = (channels) => {
	const digits = channels
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
	return digits[0] === digits[1] &&
		digits[2] === digits[3] &&
		digits[4] === digits[5]
		? `#${digits[0]}${digits[2]}${digits[4]}`
		: `#${digits}`;
};

/**
 * The named colors that beat their own hex spelling, as packed `0xrrggbb` ->
 * name — so the minifier looks a name up and uses it if there is one, with no
 * length test of its own. Both datasets must list exactly the same names:
 * `mdn-data` is the spec's list and `color-name` the byte values, so a
 * disagreement means one of them moved and the table can no longer be trusted.
 * @returns {[number, string][]} the entries, sorted by packed value
 */
const collectColorNames = () => {
	const spec = syntaxes["named-color"].syntax
		.split("|")
		.map((name) => name.trim());
	const values = Object.keys(colorName);
	const missing = spec.filter((name) => !(name in colorName));
	const extra = values.filter((name) => !spec.includes(name));
	if (missing.length !== 0 || extra.length !== 0) {
		throw new Error(
			`mdn-data and color-name disagree on the named colors: ${
				missing.length !== 0 ? `no value for ${missing.join(", ")}; ` : ""
			}${extra.length !== 0 ? `not in the spec list: ${extra.join(", ")}` : ""}`
		);
	}
	/** @type {Map<number, string>} */
	const shortest = new Map();
	// Sorted, so two names of the same length (`aqua`/`cyan`, `gray`/`grey`)
	// always resolve to the same one.
	for (const name of [...spec].sort()) {
		const channels = colorName[name];
		if (name.length >= hex(channels).length) continue;
		const [red, green, blue] = channels;
		const packed = (red << 16) | (green << 8) | blue;
		const previous = shortest.get(packed);
		if (previous === undefined || name.length < previous.length) {
			shortest.set(packed, name);
		}
	}
	return [...shortest].sort((a, b) => a[0] - b[0]);
};

/**
 * @param {string[]} names entries
 * @returns {string} its `new Set([…])` literal — prettier wraps it on emit
 */
const setLiteral = (names) =>
	`new Set([${names.map((name) => `"${name}"`).join(", ")}])`;

/**
 * @param {[string, string][]} entries the table
 * @returns {string} its `new Map([…])` literal — prettier wraps it on emit
 */
const mapLiteral = (entries) =>
	`new Map([${entries.map(([key, value]) => `["${key}", "${value}"]`).join(", ")}])`;

// Spec prose no dataset states: an equivalence between two spellings, or a
// judgement about what a construct still does. Each carries the reason it has to
// be written out rather than derived.
/** @type {{ cssWideKeywords: string[], cubicBezierKeywords: [string, string][], flexKeywords: [string, string][], fontWeightNumbers: [string, string][], legacyPseudoElements: string[], compoundContinuations: string[], zeroUnitKeepingProperties: string[], droppableWhenEmptyAtRules: string[] }} */
const SUPPLEMENT = {
	// CSS Values 4's list. `mdn-data` has no `css-wide-keyword` production.
	cssWideKeywords: ["inherit", "initial", "revert", "revert-layer", "unset"],
	// CSS Easing 1 §2 defines each keyword as exactly this curve; the syntax
	// database describes `cubic-bezier()`'s shape, not which curves have a name.
	// Keyed by the arguments as `Number` prints them.
	cubicBezierKeywords: [
		["0.25,0.1,0.25,1", "ease"],
		["0,0,1,1", "linear"],
		["0.42,0,1,1", "ease-in"],
		["0,0,0.58,1", "ease-out"],
		["0.42,0,0.58,1", "ease-in-out"]
	],
	// CSS Flexbox 7.1.1's two keyword spellings. `1 1 0` is deliberately absent:
	// the one-value `flex:1` expands to `1 1 0%`, and a length `0` is not a
	// percentage `0%` when the container's main size is indefinite.
	flexKeywords: [
		["0 0 auto", "none"],
		["1 1 auto", "auto"]
	],
	// CSS Fonts 4 §2.2 defines these two keywords as those weights, and the
	// computed value is the number either way. `bolder` / `lighter` are relative
	// to the parent's weight, so they have no fixed number.
	fontWeightNumbers: [
		["normal", "400"],
		["bold", "700"]
	],
	// Selectors 4 §3.3: engines must accept the one-colon spelling for the
	// pseudo-elements CSS 1 and 2 introduced. Only these four — `::selection` and
	// the rest have no legacy spelling.
	legacyPseudoElements: ["before", "after", "first-line", "first-letter"],
	// What may follow the `*` a compound selector implies: another simple
	// selector in the same compound. Selector syntax, not a value grammar.
	compoundContinuations: [":", ".", "#", "["],
	// `flex-basis` is the one place a zero's unit is still load-bearing: IE 11
	// drops a `flex` shorthand whose basis has none, and the shorthand carries
	// one too.
	zeroUnitKeepingProperties: ["flex", "flex-basis"],
	// At-rules whose empty block is inert. Not `@keyframes` (an empty one still
	// runs the animation, firing its events) and not `@layer` (an empty block
	// declares the layer's cascade order).
	droppableWhenEmptyAtRules: ["media", "supports", "container"]
};

const boxShorthands = collectBoxShorthands(false);
const slashShorthands = collectBoxShorthands(true);
const boxLonghands = collectBoxLonghands([
	...boxShorthands,
	...slashShorthands
]);
const colorFunctions = collectColorArgumentFunctions();
const colorNames = collectColorNames();
const mathFunctions = collectMathFunctions();
const substitutionFunctions = collectSubstitutionFunctions();

const source = `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

// GENERATED by tooling/generate-css-data.js — do not edit.
// Sources: mdn-data ${mdnDataPackage.version}, color-name ${colorNamePackage.version}.

"use strict";

// Properties whose value is CSS's \`{1,4}\` box notation, where an omitted value
// is copied from the opposite side. That makes a repeated value redundant:
// \`margin:1px 1px 1px 1px\` is \`margin:1px\`. \`border-radius\` collapses each side
// of its \`/\` independently.
const BOX_SHORTHANDS = ${setLiteral([...boxShorthands, ...slashShorthands].sort())};

// The subset carrying a second box after a \`/\`, which collapses on its own.
const SLASH_BOX_SHORTHANDS = ${setLiteral(slashShorthands)};

// The four longhands each box shorthand sets, in \`top right bottom left\` order.
// Only the families whose longhands are the four sides: merging those into the
// shorthand sets exactly the same properties, resetting nothing extra. Corner
// families (\`border-radius\`) are absent — \`{1,4}\` orders their longhands
// differently.
// prettier-ignore
const BOX_LONGHANDS = new Map([
${boxLonghands
	.map(
		([shorthand, longhands]) =>
			`\t["${shorthand}", [${longhands.map((l) => `"${l}"`).join(", ")}]]`
	)
	.join(",\n")}
]);

// Functions that take a \`<color>\` directly, so a hash among their arguments is a
// hex color rather than a case-sensitive reference (\`element(#id)\`). Only direct
// arguments: a gradient nested in \`image-set()\` is matched as the gradient.
const COLOR_ARGUMENT_FUNCTIONS = ${setLiteral(colorFunctions)};

// Functions that substitute an arbitrary token sequence, so two identical
// references need not be one repeated value: with \`--x:1px 2px\`,
// \`margin:var(--x) var(--x)\` is four values, not two.
const SUBSTITUTION_FUNCTIONS = ${setLiteral(substitutionFunctions)};

// CSS Values 4's math functions: everything inside one is a math expression, so
// \`*\` and \`/\` there are operators, and the whitespace around them carries nothing.
const MATH_FUNCTIONS = ${setLiteral(mathFunctions)};

// A CSS-wide keyword is only valid as the whole value, so a box repeating one is
// invalid and already discarded — collapsing it would switch the declaration on.
const CSS_WIDE_KEYWORDS = ${setLiteral(SUPPLEMENT.cssWideKeywords)};

// \`<easing-function>\` argument lists that are exactly a shorter keyword, keyed
// by the arguments as \`Number\` prints them.
const CUBIC_BEZIER_KEYWORDS = ${mapLiteral(SUPPLEMENT.cubicBezierKeywords)};

// The two \`flex\` values CSS Flexbox 7.1.1 gives a keyword spelling.
const FLEX_KEYWORDS = ${mapLiteral(SUPPLEMENT.flexKeywords)};

// The \`font-weight\` keywords CSS Fonts 4 §2.2 defines as a number, which is what
// \`getComputedStyle().fontWeight\` reports either way.
const FONT_WEIGHT_NUMBERS = ${mapLiteral(SUPPLEMENT.fontWeightNumbers)};

// Selectors 4 §3.3: the pseudo-elements engines must also accept with one colon,
// so their second colon carries nothing.
const LEGACY_PSEUDO_ELEMENTS = ${setLiteral(SUPPLEMENT.legacyPseudoElements)};

// What may follow the \`*\` a compound selector implies: another simple selector
// in the same compound. A separator between them would be a descendant
// combinator instead, and \`|\` makes the \`*\` a namespace's, not a redundant one.
const COMPOUND_CONTINUATIONS = ${setLiteral(SUPPLEMENT.compoundContinuations)};

// The properties whose zero length keeps its unit — the one place it is still
// load-bearing.
const ZERO_UNIT_KEEPING_PROPERTIES = ${setLiteral(SUPPLEMENT.zeroUnitKeepingProperties)};

// At-rules whose empty block is inert, so dropping it changes nothing.
const DROPPABLE_WHEN_EMPTY_AT_RULES = ${setLiteral(SUPPLEMENT.droppableWhenEmptyAtRules)};

// Packed \`0xrrggbb\` -> the shortest named color with that value. Only names that
// can beat \`#rrggbb\`; anything longer would never be picked.
const RGB_TO_NAME = new Map([
${colorNames
	.map(
		([packed, name]) =>
			`\t[0x${packed.toString(16).padStart(6, "0")}, "${name}"]`
	)
	.join(",\n")}
]);

module.exports.BOX_LONGHANDS = BOX_LONGHANDS;
module.exports.BOX_SHORTHANDS = BOX_SHORTHANDS;
module.exports.COLOR_ARGUMENT_FUNCTIONS = COLOR_ARGUMENT_FUNCTIONS;
module.exports.COMPOUND_CONTINUATIONS = COMPOUND_CONTINUATIONS;
module.exports.CSS_WIDE_KEYWORDS = CSS_WIDE_KEYWORDS;
module.exports.CUBIC_BEZIER_KEYWORDS = CUBIC_BEZIER_KEYWORDS;
module.exports.DROPPABLE_WHEN_EMPTY_AT_RULES = DROPPABLE_WHEN_EMPTY_AT_RULES;
module.exports.FLEX_KEYWORDS = FLEX_KEYWORDS;
module.exports.FONT_WEIGHT_NUMBERS = FONT_WEIGHT_NUMBERS;
module.exports.LEGACY_PSEUDO_ELEMENTS = LEGACY_PSEUDO_ELEMENTS;
module.exports.MATH_FUNCTIONS = MATH_FUNCTIONS;
module.exports.RGB_TO_NAME = RGB_TO_NAME;
module.exports.SLASH_BOX_SHORTHANDS = SLASH_BOX_SHORTHANDS;
module.exports.SUBSTITUTION_FUNCTIONS = SUBSTITUTION_FUNCTIONS;
module.exports.ZERO_UNIT_KEEPING_PROPERTIES = ZERO_UNIT_KEEPING_PROPERTIES;
`;

const summary = `${boxShorthands.length + slashShorthands.length} box shorthands (${slashShorthands.length} with a \`/\`), ${colorFunctions.length} color functions, ${substitutionFunctions.length} substitution functions, ${colorNames.length} color names`;
// Formatted here rather than left to `yarn fmt`, so the comparison below is
// against what the repo actually checks in.
prettier
	.resolveConfig(TARGET)
	.then((config) => prettier.format(source, { ...config, filepath: TARGET }))
	.then((formatted) => {
		const current = fs.existsSync(TARGET)
			? fs.readFileSync(TARGET, "utf8")
			: "";
		if (current === formatted) {
			process.stdout.write(`lib/css/data.js is up to date (${summary})\n`);
		} else if (write) {
			fs.writeFileSync(TARGET, formatted);
			process.stdout.write(`lib/css/data.js updated (${summary})\n`);
		} else {
			process.stderr.write(
				"lib/css/data.js is out of date — run `yarn fix:special`\n"
			);
			process.exitCode = 1;
		}
	});
