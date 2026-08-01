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
// Tables no dataset states stay hand-written in `lib/css/syntax.js`, each with
// the reason: the `cubic-bezier()` and `flex` keyword equivalences (spec prose,
// not machine-readable) and the at-rules whose empty block is inert (a judgement
// about what an empty block still does).

const fs = require("fs");
const path = require("path");
const colorName = require("color-name");
const functions = require("mdn-data/css/functions.json");
const properties = require("mdn-data/css/properties.json");
const syntaxes = require("mdn-data/css/syntaxes.json");

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

/**
 * @returns {string[]} the `{1,4}` box-shorthand property names, sorted
 */
const collectBoxShorthands = () => {
	const names = [];
	for (const [
		name,
		property
	] of /** @type {[string, { syntax?: string, status?: string }][]} */ (
		Object.entries(properties)
	)) {
		if (typeof property.syntax !== "string") continue;
		if (property.status !== "standard") continue;
		if (!BOX_NOTATION.test(property.syntax)) continue;
		if (POSITIONAL_KEYWORD.test(property.syntax)) continue;
		names.push(name);
	}
	return names.sort();
};

// Every value-definition production, function ones included. `functions.json`
// and `syntaxes.json` overlap; `syntaxes.json` wins, as the more complete of the
// two for the productions they share.
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
const references = (syntax) =>
	(syntax.match(/<[^>\s]+>/g) || []).map((name) => name.slice(1, -1));

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
	const names = [];
	for (const [name, syntax] of definitions) {
		if (!name.endsWith("()")) continue;
		if (references(syntax).some((child) => reachesColor(child, new Set()))) {
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
 * @returns {string} them as a `new Set([…])` body
 */
const setBody = (names) => names.map((name) => `\t"${name}"`).join(",\n");

const boxShorthands = collectBoxShorthands();
const colorFunctions = collectColorArgumentFunctions();
const colorNames = collectColorNames();

const source = `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

// GENERATED by tooling/generate-css-data.js — do not edit.
// Sources: mdn-data ${require("mdn-data/package.json").version}, color-name ${require("color-name/package.json").version}.

"use strict";

// Properties whose value is CSS's \`{1,4}\` box notation, where an omitted value
// is copied from the opposite side. That makes a repeated value redundant:
// \`margin:1px 1px 1px 1px\` is \`margin:1px\`. \`border-radius\` collapses each side
// of its \`/\` independently.
const BOX_SHORTHANDS = new Set([
${setBody(boxShorthands)}
]);

// Functions that take a \`<color>\` directly, so a hash among their arguments is a
// hex color rather than a case-sensitive reference (\`element(#id)\`). Only direct
// arguments: a gradient nested in \`image-set()\` is matched as the gradient.
const COLOR_ARGUMENT_FUNCTIONS = new Set([
${setBody(colorFunctions)}
]);

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

module.exports.BOX_SHORTHANDS = BOX_SHORTHANDS;
module.exports.COLOR_ARGUMENT_FUNCTIONS = COLOR_ARGUMENT_FUNCTIONS;
module.exports.RGB_TO_NAME = RGB_TO_NAME;
`;

const summary = `${boxShorthands.length} box shorthands, ${colorFunctions.length} color functions, ${colorNames.length} color names`;
const current = fs.existsSync(TARGET) ? fs.readFileSync(TARGET, "utf8") : "";
if (current === source) {
	process.stdout.write(`lib/css/data.js is up to date (${summary})\n`);
} else if (write) {
	fs.writeFileSync(TARGET, source);
	process.stdout.write(`lib/css/data.js updated (${summary})\n`);
} else {
	process.stderr.write(
		"lib/css/data.js is out of date — run `yarn fix:special`\n"
	);
	process.exitCode = 1;
}
