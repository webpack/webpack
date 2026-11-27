"use strict";

// cspell:ignore signless

// A seeded generator of stylesheets built from mdn-data's grammars: property
// values, at-rules with their descriptors, selectors from its pseudo-classes
// and pseudo-elements, nested rules and custom properties, spelled with the
// comments, escapes, case and number forms a source may use.

/** @type {Record<string, { syntax: string, descriptors?: Record<string, { syntax: string }> }>} */
const atRules = require("mdn-data/css/at-rules.json");
/** @type {Record<string, { syntax: string, status: string }>} */
const properties = require("mdn-data/css/properties.json");
/** @type {Record<string, { syntax: string }>} */
const selectors = require("mdn-data/css/selectors.json");
/** @type {Record<string, { syntax: string }>} */
const syntaxes = require("mdn-data/css/syntaxes.json");
/** @type {Record<string, unknown>} */
const units = require("mdn-data/css/units.json");
const { VOID } = require("../../lib/html/data");
const {
	parseValueSyntax,
	walkValueSyntax
} = require("../../tooling/generate-css-data");

/** @import { SyntaxNode, TypeNode } from "../../tooling/generate-css-data.js" */

/**
 * Where a value is written, which decides what a block's contents are and
 * which descriptors a type may name.
 * @typedef {object} Context
 * @property {number} depth how deep in grammar references the generator is
 * @property {number} nesting how deep in blocks the generator is
 * @property {string | undefined} atRule the at-rule whose block holds the value
 */

// Past this many references a choice takes its cheapest alternative, so a
// recursive grammar (`<calc-sum>`, `<media-condition>`) always ends.
const MAX_DEPTH = 8;
const MAX_NESTING = 4;

/** @type {Record<string, string[]>} */
const DIMENSION_UNITS = {
	angle: ["deg", "grad", "rad", "turn"],
	time: ["s", "ms"],
	frequency: ["Hz", "kHz"],
	resolution: ["dpi", "dpcm", "dppx", "x"],
	flex: ["fr"]
};
// mdn-data does not say which unit measures what; every unit it lists that is
// not one of the others is a length.
const OTHER_UNITS = new Set(Object.values(DIMENSION_UNITS).flat());
const LENGTH_UNITS = Object.keys(units).filter(
	(unit) => !OTHER_UNITS.has(unit)
);
const NUMBERS = [
	"0",
	"1",
	"2",
	"10",
	"100",
	"0.5",
	".5",
	"1.25",
	"33.3333333",
	"1e3",
	"1E-2",
	"360",
	"+3",
	"0.0",
	"00"
];
const INTEGERS = ["0", "1", "2", "3", "10", "100", "007", "-1", "+4"];
const IDENTS = [
	"a",
	"foo",
	"Bar",
	"x-y",
	"_z",
	"\\31 a",
	"b\\.c",
	"é",
	"none-ish"
];
const STRINGS = [
	'"a"',
	"'b'",
	'""',
	'"a b"',
	"'it\\'s'",
	'"\\"q\\""',
	'"x\\\ny"',
	'"\\66 oo"'
];
const URLS = [
	"url(a.png)",
	'url("b c.png")',
	"url( 'd.svg#e' )",
	"url(data:image/png;base64,AA==)",
	"url()"
];
const COMMENTS = ["/**/", "/* c */", "/*! legal */", "/* a*/", "/*\n*/"];
const ELEMENTS = [
	"div",
	"span",
	"a",
	"p",
	"ul",
	"li",
	"input",
	"button",
	"html",
	"body",
	"svg",
	"h1",
	"table",
	"td",
	...VOID
];
const COMBINATORS = [" ", " > ", ">", " + ", "~", " ~ ", "\n"];

/**
 * @template T
 * @param {() => number} random a number in [0, 1) per call
 * @param {readonly T[]} list the choices
 * @returns {T} one of them
 */
const pick = (random, list) => list[Math.floor(random() * list.length)];

/**
 * @param {() => number} random a number in [0, 1) per call
 * @param {number | null} min the smallest the grammar allows
 * @returns {string} a number
 */
const number = (random, min) => {
	const value = pick(random, NUMBERS);
	if (min !== null && min >= 0) return value.replace(/^[+-]/, "");
	return random() < 0.2 ? `-${value.replace(/^[+-]/, "")}` : value;
};

/**
 * @param {() => number} random a number in [0, 1) per call
 * @returns {string} an identifier, now and then respelled with an escape
 */
const ident = (random) => {
	const name = pick(random, IDENTS);
	return random() < 0.1 ? `\\${name}` : name;
};

/**
 * @param {string[]} unitsToPick the units to choose from
 * @returns {(random: () => number) => string} a dimension in one of them
 */
const dimension = (unitsToPick) => (random) => {
	const unit = pick(random, unitsToPick);
	return `${number(random, null)}${random() < 0.1 ? unit.toUpperCase() : unit}`;
};

// Types the grammar names but never spells, or spells as tokens.
/** @type {Record<string, (random: () => number) => string>} */
const BASE_TYPES = {
	number: (random) => number(random, null),
	"number-token": (random) => number(random, null),
	integer: (random) => pick(random, INTEGERS),
	"signed-integer": (random) => pick(random, ["+1", "-2", "+0"]),
	"signless-integer": (random) => pick(random, ["1", "2", "0"]),
	percentage: (random) => `${number(random, null)}%`,
	length: (random) => (random() < 0.15 ? "0" : dimension(LENGTH_UNITS)(random)),
	angle: dimension(DIMENSION_UNITS.angle),
	time: dimension(DIMENSION_UNITS.time),
	frequency: dimension(DIMENSION_UNITS.frequency),
	resolution: dimension(DIMENSION_UNITS.resolution),
	flex: dimension(DIMENSION_UNITS.flex),
	dimension: dimension([...LENGTH_UNITS, ...DIMENSION_UNITS.angle]),
	"dimension-token": dimension(LENGTH_UNITS),
	zero: () => "0",
	ident,
	"ident-token": ident,
	"custom-ident": ident,
	"dashed-ident": (random) => `--${pick(random, ["a", "b-c", "X", "\\31 a"])}`,
	"custom-property-name": (random) => `--${pick(random, ["a", "b-c", "X"])}`,
	"attr-name": ident,
	string: (random) => pick(random, STRINGS),
	"string-token": (random) => pick(random, STRINGS),
	url: (random) => pick(random, URLS),
	"hex-color": (random) =>
		pick(random, ["#fff", "#FFF", "#ff0000", "#f00f", "#12345678", "#aBc"]),
	"hash-token": (random) => pick(random, ["#a", "#fff", "#-x"]),
	"unicode-range": (random) =>
		pick(random, ["U+0-7F", "u+0025-00ff", "U+4??", "U+26"]),
	"unicode-range-token": (random) => pick(random, ["U+0-7F", "U+4??"]),
	"an+b": (random) =>
		pick(random, [
			"odd",
			"EVEN",
			"2n+1",
			"-n+3",
			"3",
			"+5",
			"n",
			"2n",
			"0n+0",
			"-2n- 1",
			"2N + 1"
		]),
	"any-value": (random) =>
		pick(random, ["a b", "1px", "{x}", "(1)", "f(a, b)"]),
	"declaration-value": (random) =>
		pick(random, ["a", " 1px  2px ", "x(y)", "[a]", "{}", "1/2"]),
	"function-token": (random) => `${ident(random)}(`,
	"language-code": (random) => pick(random, ["en", '"fr-CA"', "*-Latn"]),
	charset: () => '"UTF-8"',
	"form-control-identifier": () => "select",
	// A token the grammar names but no type spells, as `@page`'s `<page-body>`.
	"page-margin-box-type": (random) =>
		pick(random, ["@top-left", "@bottom-center", "@right-middle"]),
	"attr-unit": (random) => pick(random, ["%", "px", "em", "deg"]),
	autospace: (random) =>
		pick(random, ["no-autospace", "ideograph-alpha", "punctuation insert"]),
	"counter-system": (random) =>
		pick(random, ["cyclic", "numeric", "fixed 2", "extends decimal"]),
	"counter-symbols": (random) => pick(random, ['"*"', '"a" "b" "c"', "x"]),
	"negative-symbol": (random) => pick(random, ['"-"', '"(" ")"']),
	"intrinsic-size-keyword": (random) =>
		pick(random, ["min-content", "max-content", "fit-content"]),
	param: (random) => pick(random, ["param(--a)", "param(--a, 1px)"])
};

// The types whose grammars are selectors, written by `selectorList` instead:
// mdn-data spells pseudo-classes as raw tokens.
const SELECTOR_TYPES = new Set([
	"selector",
	"selector-list",
	"complex-selector",
	"complex-selector-list",
	"compound-selector",
	"compound-selector-list",
	"forgiving-selector-list",
	"relative-selector",
	"relative-selector-list",
	"forgiving-relative-selector-list",
	"simple-selector",
	"scope-start",
	"scope-end"
]);

// What a block's contents are, by the type naming them.
const BLOCK_TYPES = new Set([
	"stylesheet",
	"rule-list",
	"group-rule-body",
	"block-contents",
	"qualified-rule-list",
	"declaration-list",
	"declaration",
	"feature-value-block-list",
	"keyframe-block-list"
]);

/** @type {Map<string, SyntaxNode>} */
const parsed = new Map();

/**
 * @param {string} key where the grammar comes from, to remember it by
 * @param {string} source the grammar
 * @returns {SyntaxNode} its tree
 */
const grammar = (key, source) => {
	let tree = parsed.get(key);
	if (tree === undefined) {
		tree = parseValueSyntax(source);
		parsed.set(key, tree);
	}
	return tree;
};

const PROPERTY_NAMES = Object.keys(properties).filter(
	(name) => properties[name].status !== "obsolete"
);
const AT_RULE_NAMES = Object.keys(atRules).filter(
	(name) => name !== "@document" && name !== "@charset"
);
// Each pseudo-class and pseudo-element, and for a functional one the grammar
// of what its parentheses hold.
/** @type {[string, string | null][]} */
const PSEUDOS = [];
for (const { syntax } of Object.values(selectors)) {
	const match = /^(::?[\w-]+)(?:\(([\s\S]*)\))?$/.exec(syntax.trim());
	if (match === null) continue;
	PSEUDOS.push([match[1], match[2] === undefined ? null : match[2]]);
}

/**
 * Every type the data names that the generator cannot write: neither a named
 * syntax, a property, a descriptor nor one of its own. A new one in mdn-data
 * would otherwise be written as a bare identifier without anyone noticing.
 * @returns {string[]} the unwritten type names, sorted
 */
const unwrittenTypes = () => {
	/** @type {Set<string>} */
	const descriptors = new Set();
	/** @type {string[]} */
	const sources = [];
	for (const rule of Object.values(atRules)) {
		sources.push(rule.syntax);
		for (const [name, { syntax }] of Object.entries(rule.descriptors || {})) {
			descriptors.add(name);
			sources.push(syntax);
		}
	}
	for (const { syntax } of Object.values(properties)) sources.push(syntax);
	for (const { syntax } of Object.values(syntaxes)) sources.push(syntax);
	/** @type {Set<string>} */
	const unwritten = new Set();
	for (const source of sources) {
		walkValueSyntax(parseValueSyntax(source), (node) => {
			if (node.type !== "type") return;
			const name = node.name.replace(/\(\)$/, "");
			if (
				name in syntaxes ||
				node.name in syntaxes ||
				name in properties ||
				name in BASE_TYPES ||
				descriptors.has(name) ||
				SELECTOR_TYPES.has(name) ||
				BLOCK_TYPES.has(name)
			) {
				return;
			}
			unwritten.add(node.name);
		});
	}
	return [...unwritten].sort();
};

/**
 * A generator of stylesheets for a seed: each call writes the next one.
 * @param {number} seed the seed
 * @param {(seed: number) => () => number} createRandom the seeded number source
 * @returns {{ stylesheet: () => string, declarations: () => string }} the next stylesheet, or the next `style` attribute's declarations, per call
 */
const createStylesheetGenerator = (seed, createRandom) => {
	const random = createRandom(seed);
	/**
	 * @param {number} n how many choices
	 * @returns {number} one of `0` to `n - 1`
	 */
	const below = (n) => Math.floor(random() * n);
	/**
	 * @param {number} chance the probability
	 * @returns {boolean} whether this call hit it
	 */
	const chance = (chance) => random() < chance;

	/**
	 * What goes between two tokens: usually a space, sometimes a comment or a
	 * line break, which the printer has to drop or keep apart alike.
	 * @returns {string} the separator
	 */
	const gap = () => {
		if (chance(0.05)) return pick(random, COMMENTS);
		if (chance(0.03)) return pick(random, ["\n", "\t", "  "]);
		return " ";
	};

	/**
	 * @param {string} keyword a keyword
	 * @returns {string} the keyword, now and then in another case
	 */
	const respell = (keyword) => {
		if (!/^[a-z-]+$/i.test(keyword)) return keyword;
		if (chance(0.06)) return keyword.toUpperCase();
		// An escaped first letter names the same keyword.
		if (chance(0.02) && /^[a-z]/i.test(keyword)) {
			return `\\${keyword.charCodeAt(0).toString(16)} ${keyword.slice(1)}`;
		}
		return keyword;
	};

	/**
	 * @param {string[]} parts what to write in order
	 * @returns {string} the parts joined, `.` and `=` held to their neighbors
	 */
	const join = (parts) => {
		let out = "";
		for (const part of parts) {
			if (part === "") continue;
			if (
				out === "" ||
				part === "." ||
				part === "=" ||
				out.endsWith(".") ||
				out.endsWith("(")
			) {
				out += part;
			} else {
				out += gap() + part;
			}
		}
		return out;
	};

	/**
	 * The least depth a node can be written at, so a choice past `MAX_DEPTH`
	 * takes an alternative that ends.
	 * @param {SyntaxNode} node the node
	 * @param {Set<string>} seen types being measured, to cut a cycle
	 * @returns {number} its cost
	 */
	const cost = (node, seen) => {
		switch (node.type) {
			case "keyword":
			case "literal":
				return 0;
			case "type": {
				const name = node.name.replace(/\(\)$/, "");
				if (name in BASE_TYPES || SELECTOR_TYPES.has(name)) return 0;
				if (BLOCK_TYPES.has(name)) return 1;
				const source = (
					syntaxes[node.name] ||
					syntaxes[name] ||
					properties[name] ||
					{}
				).syntax;
				if (source === undefined) return 0;
				if (seen.has(name)) return Infinity;
				seen.add(name);
				const inner = cost(grammar(`syntax:${name}`, source), seen);
				seen.delete(name);
				return inner + 1;
			}
			case "property":
				return 1;
			case "function":
				return node.body === null ? 0 : cost(node.body, seen);
			case "group":
			case "parens":
				return cost(node.body, seen);
			case "multiplier":
				return node.min === 0 ? 0 : cost(node.body, seen);
			case "oneOf":
				return Math.min(...node.items.map((item) => cost(item, seen)));
			case "anyOf":
				return Math.min(...node.items.map((item) => cost(item, seen)));
			default:
				return Math.max(0, ...node.items.map((item) => cost(item, seen)));
		}
	};

	/**
	 * @param {SyntaxNode[]} items the alternatives
	 * @param {Context} context where the value is written
	 * @returns {SyntaxNode} one of them, the cheapest once deep enough
	 */
	const choose = (items, context) => {
		if (context.depth < MAX_DEPTH) return pick(random, items);
		let best = items[0];
		let bestCost = Infinity;
		for (const item of items) {
			const itemCost = cost(item, new Set());
			if (itemCost < bestCost) {
				best = item;
				bestCost = itemCost;
			}
		}
		return best;
	};

	/**
	 * @template T
	 * @param {T[]} list the items
	 * @returns {T[]} the same items in a random order
	 */
	const shuffle = (list) => {
		const out = [...list];
		for (let i = out.length - 1; i > 0; i--) {
			const j = below(i + 1);
			[out[i], out[j]] = [out[j], out[i]];
		}
		return out;
	};

	/**
	 * @param {SyntaxNode} node a grammar node
	 * @param {Context} context where the value is written
	 * @returns {string} a value the node matches
	 */
	const write = (node, context) => {
		switch (node.type) {
			case "keyword":
				return respell(node.name);
			case "literal":
				return node.value;
			case "property": {
				const property = properties[node.name];
				return property === undefined
					? ident(random)
					: write(grammar(`property:${node.name}`, property.syntax), {
							...context,
							depth: context.depth + 1
						});
			}
			case "type":
				return writeType(node, context);
			case "function":
				return `${respell(node.name)}(${
					node.body === null ? "" : write(node.body, context)
				})`;
			case "group":
				return write(node.body, context);
			case "parens":
				return `(${write(node.body, context)})`;
			case "multiplier": {
				const deep = context.depth >= MAX_DEPTH;
				const most = Math.min(node.max, node.min + (deep ? 0 : 3));
				const count = node.min + below(most - node.min + 1);
				/** @type {string[]} */
				const values = [];
				for (let i = 0; i < count; i++) values.push(write(node.body, context));
				return node.comma ? values.join(`,${gap()}`) : join(values);
			}
			case "oneOf":
				return write(choose(node.items, context), context);
			case "anyOf": {
				const chosen = shuffle(node.items).filter(
					(item, i) => i === 0 || (context.depth < MAX_DEPTH && chance(0.4))
				);
				if (context.depth >= MAX_DEPTH) chosen[0] = choose(node.items, context);
				return join(chosen.map((item) => write(item, context)));
			}
			case "allOf":
				return join(shuffle(node.items).map((item) => write(item, context)));
			default:
				return join(node.items.map((item) => write(item, context)));
		}
	};

	/**
	 * @param {TypeNode} node a `<type>`
	 * @param {Context} context where the value is written
	 * @returns {string} a value of that type
	 */
	const writeType = (node, context) => {
		const name = node.name.replace(/\(\)$/, "");
		if (name === "number" || name === "integer" || name === "percentage") {
			const value = BASE_TYPES[name](random);
			return node.min !== null && node.min >= 0
				? value.replace(/^-/, "")
				: value;
		}
		const base = BASE_TYPES[name];
		if (base !== undefined) return base(random);
		// A compound selector takes no combinator, as `::slotted()` holds one.
		if (name === "compound-selector") return compound(context);
		if (SELECTOR_TYPES.has(name)) return selectorList(context, 1);
		if (BLOCK_TYPES.has(name)) return block(name, context);
		const deeper = { ...context, depth: context.depth + 1 };
		const named = syntaxes[node.name] || syntaxes[name];
		if (named !== undefined) {
			return write(grammar(`syntax:${node.name}`, named.syntax), deeper);
		}
		const descriptor =
			context.atRule !== undefined &&
			(atRules[context.atRule].descriptors || {})[name];
		if (descriptor) {
			return write(
				grammar(`descriptor:${context.atRule}:${name}`, descriptor.syntax),
				deeper
			);
		}
		const property = properties[name];
		if (property !== undefined) {
			return write(grammar(`property:${name}`, property.syntax), deeper);
		}
		return ident(random);
	};

	/**
	 * @param {Context} context where the selector is written
	 * @returns {string} one compound selector
	 */
	const compound = (context) => {
		let out = "";
		if (chance(0.6)) {
			out += chance(0.15) ? "*" : respell(pick(random, ELEMENTS));
		}
		if (context.nesting > 0 && chance(0.3)) out = `&${out}`;
		const simple = below(3) + (out === "" ? 1 : 0);
		for (let i = 0; i < simple; i++) {
			switch (below(4)) {
				case 0:
					out += `.${ident(random)}`;
					break;
				case 1:
					out += `#${pick(random, ["a", "b1", "\\31 x", "-y"])}`;
					break;
				case 2: {
					const name = pick(random, ["href", "data-x", "TYPE", "lang"]);
					out += chance(0.3)
						? `[${name}]`
						: `[${name}${pick(random, [
								"=",
								"~=",
								"|=",
								"^=",
								"$=",
								"*="
							])}${pick(random, [...STRINGS, "x", "1"])}${pick(random, [
								"",
								" i",
								" s",
								" I"
							])}]`;
					break;
				}
				default: {
					const [pseudo, argument] = pick(random, PSEUDOS);
					if (argument === null) {
						out += respell(pseudo);
					} else if (context.depth >= MAX_DEPTH) {
						continue;
					} else {
						const inner = write(grammar(`pseudo:${pseudo}`, argument), {
							...context,
							depth: context.depth + 2
						});
						out += `${pseudo}(${inner})`;
					}
				}
			}
		}
		return out === "" ? "*" : out;
	};

	/**
	 * @param {Context} context where the selectors are written
	 * @param {number} most how many complex selectors at most
	 * @returns {string} a selector list
	 */
	const selectorList = (context, most) => {
		/** @type {string[]} */
		const list = [];
		const count = 1 + below(most);
		for (let i = 0; i < count; i++) {
			let complex = compound(context);
			const more = context.depth >= MAX_DEPTH ? 0 : below(3);
			for (let j = 0; j < more; j++) {
				complex += pick(random, COMBINATORS) + compound(context);
			}
			list.push(complex);
		}
		return list.join(pick(random, [",", ", ", " ,\n"]));
	};

	/**
	 * @param {Context} context where the declaration is written
	 * @returns {string} one declaration, without its `;`
	 */
	const declaration = (context) => {
		if (context.atRule !== undefined) {
			const descriptors = atRules[context.atRule].descriptors;
			if (descriptors !== undefined && chance(0.8)) {
				const name = pick(random, Object.keys(descriptors));
				return `${name}:${write(
					grammar(
						`descriptor:${context.atRule}:${name}`,
						descriptors[name].syntax
					),
					context
				)}`;
			}
		}
		if (chance(0.08)) {
			return `--${pick(random, ["a", "b", "x-y"])}:${pick(random, [
				"",
				" ",
				"1px",
				" {a:b}",
				"red;",
				"var(--a)",
				"  x  /**/ y "
			]).replace(";", "")}`;
		}
		const name = pick(random, PROPERTY_NAMES);
		const value = write(grammar(`property:${name}`, properties[name].syntax), {
			...context,
			depth: 1
		});
		const important = chance(0.08)
			? pick(random, ["!important", " ! important", "!IMPORTANT"])
			: "";
		return `${respell(name)}${pick(random, [
			":",
			": ",
			" :"
		])}${value}${important}`;
	};

	/**
	 * @param {Context} context where the declarations are written
	 * @returns {string} a semicolon-separated declaration list
	 */
	const declarations = (context) => {
		/** @type {string[]} */
		const list = [];
		const count = below(7);
		for (let i = 0; i < count; i++) list.push(declaration(context));
		return (
			list.join(pick(random, [";", "; ", ";\n", ";;"])) +
			(chance(0.5) ? ";" : "")
		);
	};

	/**
	 * @param {Context} context where the rule is written
	 * @returns {string} a style rule, its block nesting rules now and then
	 */
	const styleRule = (context) => {
		const inner = { ...context, nesting: context.nesting + 1, depth: 0 };
		let body = declarations(inner);
		if (context.nesting < MAX_NESTING && chance(0.3)) {
			// Without the `;` a custom property's value would take the rules in.
			body += `;${gap()}${rules(inner, 2)}`;
		}
		return `${selectorList(context, 4)}${gap()}{${body}}`;
	};

	/**
	 * @param {string} type the type naming the block's contents
	 * @param {Context} context where the block is written
	 * @returns {string} what the block holds
	 */
	const block = (type, context) => {
		const inner = { ...context, nesting: context.nesting + 1, depth: 0 };
		switch (type) {
			case "declaration":
				return declaration(inner);
			case "declaration-list":
				return declarations(inner);
			case "qualified-rule-list":
			case "keyframe-block-list":
				if (context.atRule === "@keyframes") {
					/** @type {string[]} */
					const frames = [];
					const count = 1 + below(3);
					for (let i = 0; i < count; i++) {
						frames.push(
							`${pick(random, [
								"from",
								"to",
								"0%",
								"50%",
								"100%",
								"FROM",
								"10%,90%",
								"entry 10%"
							])}{${declarations({ ...inner, atRule: undefined })}}`
						);
					}
					return frames.join(gap());
				}
				return rules({ ...inner, atRule: undefined }, 2);
			case "feature-value-block-list":
				return `${pick(random, ["@swash", "@styleset", "@annotation"])}{${ident(
					random
				)}:${pick(random, INTEGERS)}}`;
			default:
				return context.nesting >= MAX_NESTING
					? declarations({ ...inner, atRule: undefined })
					: rules({ ...inner, atRule: undefined }, 3);
		}
	};

	/**
	 * @param {Context} context where the rule is written
	 * @returns {string} an at-rule from mdn-data's grammar
	 */
	const atRule = (context) => {
		const name = pick(random, AT_RULE_NAMES);
		return write(grammar(`at-rule:${name}`, atRules[name].syntax), {
			...context,
			depth: 0,
			atRule: name
		});
	};

	/**
	 * @param {Context} context where the rules are written
	 * @param {number} most how many at most
	 * @returns {string} style rules and at-rules
	 */
	const rules = (context, most) => {
		/** @type {string[]} */
		const list = [];
		const count = 1 + below(most);
		for (let i = 0; i < count; i++) {
			if (context.nesting > 0 && chance(0.2)) {
				// A declaration after a nested rule is its own nested declarations rule.
				list.push(`${declaration(context)};`);
			} else if (context.nesting < MAX_NESTING && chance(0.25)) {
				list.push(atRule(context));
			} else {
				list.push(styleRule(context));
			}
		}
		return list.join(gap());
	};

	return {
		stylesheet: () => {
			let sheet = rules({ depth: 0, nesting: 0, atRule: undefined }, 10);
			if (chance(0.1)) sheet = `@charset "utf-8";${sheet}`;
			if (chance(0.1)) sheet = `@import url(x.css) layer(a);${sheet}`;
			if (chance(0.05)) sheet = `<!--${sheet}-->`;
			return sheet;
		},
		declarations: () =>
			declarations({ depth: 0, nesting: 1, atRule: undefined })
	};
};

module.exports = { createStylesheetGenerator, unwrittenTypes };
