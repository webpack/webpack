/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// Generate `lib/html/data.js` — the tables the HTML minifier decides with — from
// `tooling/html-reflect.json` plus the spec facts below that no dataset states.
//
//   node tooling/generate-html-data.js --write
//
// `yarn fix:special` writes it; `yarn lint:special` runs the same generator
// without `--write` and fails when the checked-in file no longer matches, so a
// spec change lands as a reviewable diff rather than as silent drift.
//
// `tooling/html-reflect.json` is a distillation of webref's extraction of the
// HTML IDL (`w3c/webref`: `ed/idl/html.idl` and `ed/elements/html.json`), whose
// `[Reflect]`, `[ReflectURL]` and `[ReflectNonNegative]` markers state which
// content attribute an IDL member reflects and how. Refresh it with `--fetch`
// (one-off, requires network access).
//
// It cannot state everything: an attribute the spec defines with prose rather
// than pure reflection carries no marker. `SUPPLEMENT` below is exactly that
// remainder, each entry with the reason it is not derivable, and the generator
// fails if a supplement entry ever becomes derivable — that is the signal to
// delete it.

const fs = require("fs");
const path = require("path");
const prettier = require("prettier");

const TARGET = path.resolve(__dirname, "../lib/html/data.js");
const REFLECT_PATH = path.resolve(__dirname, "html-reflect.json");
const write = process.argv.includes("--write");
const fetchSource = process.argv.includes("--fetch");

const IDL_URL =
	"https://raw.githubusercontent.com/w3c/webref/main/ed/idl/html.idl";
const ELEMENTS_URL =
	"https://raw.githubusercontent.com/w3c/webref/main/ed/elements/html.json";

/** @typedef {Record<string, string[] | null>} AttributeScopes attribute name -> the elements it applies to, `null` when global */
/** @typedef {{ source: { idl: string, elements: string }, boolean: AttributeScopes, url: AttributeScopes, integer: AttributeScopes, signedInteger: string[], tokenList: AttributeScopes }} ReflectTables */

/**
 * Distill webref's HTML IDL into the reflected-attribute facts this generator
 * reads: which content attribute each IDL member reflects, on which elements,
 * and with which parse rules.
 * @param {string} idl `ed/idl/html.idl`
 * @param {{ elements: { name: string, interface?: string }[] }} elements `ed/elements/html.json`
 * @returns {ReflectTables} the distilled tables
 */
const distill = (idl, elements) => {
	/** @type {Map<string, Set<string>>} */
	const own = new Map();
	for (const element of elements.elements) {
		if (!element.interface) continue;
		if (!own.has(element.interface)) own.set(element.interface, new Set());
		/** @type {Set<string>} */ (own.get(element.interface)).add(element.name);
	}
	/** @type {Map<string, Set<string>>} */
	const children = new Map();
	for (const m of idl.matchAll(/^interface\s+(\w+)\s*:\s*(\w+)/gm)) {
		if (!children.has(m[2])) children.set(m[2], new Set());
		/** @type {Set<string>} */ (children.get(m[2])).add(m[1]);
	}
	/** @type {Map<string, Set<string>>} */
	const mixinHosts = new Map();
	for (const m of idl.matchAll(/^(\w+)\s+includes\s+(\w+);/gm)) {
		if (!mixinHosts.has(m[2])) mixinHosts.set(m[2], new Set());
		/** @type {Set<string>} */ (mixinHosts.get(m[2])).add(m[1]);
	}
	/**
	 * @param {string} name an interface or mixin name
	 * @param {Set<string>=} seen names already walked (the graph has cycles)
	 * @returns {Set<string>} every interface carrying what `name` declares
	 */
	const carriers = (name, seen = new Set()) => {
		if (seen.has(name)) return seen;
		seen.add(name);
		for (const host of mixinHosts.get(name) || []) carriers(host, seen);
		for (const child of children.get(name) || []) carriers(child, seen);
		return seen;
	};
	/**
	 * @param {string} name an interface or mixin name
	 * @returns {Set<string>} the elements it applies to
	 */
	const elementsFor = (name) => {
		/** @type {Set<string>} */
		const out = new Set();
		for (const iface of carriers(name)) {
			for (const element of own.get(iface) || []) out.add(element);
		}
		return out;
	};
	const globalElements = elementsFor("HTMLElement");

	// (partial) interface / mixin bodies, brace-matched so a nested block cannot
	// end the scan early.
	/** @type {Map<string, string>} */
	const bodies = new Map();
	const headRe = /^(?:partial\s+)?interface(?:\s+mixin)?\s+(\w+)[^{;]*\{/gm;
	let head;
	while ((head = headRe.exec(idl)) !== null) {
		let depth = 1;
		let i = headRe.lastIndex;
		for (; i < idl.length && depth > 0; i++) {
			if (idl[i] === "{") depth++;
			else if (idl[i] === "}") depth--;
		}
		bodies.set(
			head[1],
			(bodies.get(head[1]) || "") + idl.slice(headRe.lastIndex, i - 1)
		);
	}

	/** @type {{ [group: string]: { [attribute: string]: string[] | null } }} */
	const out = { boolean: {}, url: {}, integer: {}, tokenList: {} };
	/** @type {Set<string>} */
	const signed = new Set();
	/** @type {Set<string>} */
	const nonNegative = new Set();
	const memberRe =
		/\[([^\]]*)\]\s*(?:readonly\s+)?attribute\s+((?:unsigned\s+)?\w+\??)\s+(\w+)\s*;/g;
	for (const [iface, body] of bodies) {
		for (const member of body.matchAll(memberRe)) {
			const extended = member[1].replace(/\s+/g, " ");
			if (!/\bReflect/.test(extended)) continue;
			const type = member[2].replace(/\s+/g, " ");
			const explicit = /Reflect\w*="([^"]+)"/.exec(extended);
			const attribute = explicit ? explicit[1] : member[3].toLowerCase();
			const on = elementsFor(iface);
			if (on.size === 0) continue;
			const isGlobal = [...globalElements].every((e) => on.has(e));
			const group =
				type === "boolean"
					? "boolean"
					: /ReflectURL/.test(extended)
						? "url"
						: type === "unsigned long" || type === "long"
							? "integer"
							: type === "DOMTokenList"
								? "tokenList"
								: null;
			if (group === null) continue;
			// `long` is the signed parse rules unless the member says otherwise —
			// but only where every element agrees: `width` is signed on `<pre>` and
			// non-negative on `<img>`, and a `+` parses on neither of the latter.
			if (group === "integer") {
				if (type === "long" && !/ReflectNonNegative/.test(extended)) {
					signed.add(attribute);
				} else {
					nonNegative.add(attribute);
				}
			}
			const table = out[group];
			if (isGlobal) {
				table[attribute] = null;
			} else if (table[attribute] !== null) {
				table[attribute] = [
					...new Set([...(table[attribute] || []), ...on])
				].sort();
			}
		}
	}
	return {
		source: { idl: IDL_URL, elements: ELEMENTS_URL },
		boolean: out.boolean,
		url: out.url,
		integer: out.integer,
		signedInteger: [...signed].filter((a) => !nonNegative.has(a)).sort(),
		tokenList: out.tokenList
	};
};

if (fetchSource) {
	const https = require("https");

	/**
	 * @param {string} url the url
	 * @returns {Promise<string>} its body
	 */
	const get = (url) =>
		new Promise((resolve, reject) => {
			https
				.get(url, (res) => {
					let body = "";
					res.setEncoding("utf8");
					res.on("data", (chunk) => {
						body += chunk;
					});
					res.on("end", () => resolve(body));
				})
				.on("error", reject);
		});
	Promise.all([get(IDL_URL), get(ELEMENTS_URL)]).then(([idl, elements]) => {
		const distilled = distill(idl, JSON.parse(elements));
		fs.writeFileSync(REFLECT_PATH, `${JSON.stringify(distilled, null, 2)}\n`);
		process.stdout.write(
			`${path.relative(path.resolve(__dirname, ".."), REFLECT_PATH)} refreshed\n`
		);
	});
}

// §13.1.2.4's optional-tag conditions and the value grammars below are prose in
// every source — no dataset states "a `<p>` end tag may be omitted in front of
// these" or "this attribute's value is a srcset" — so they are written out.
const REFLECT_SOURCE =
	"webref's extraction of the HTML IDL (see tooling/generate-html-data.js)";

const P_FOLLOWED_BY = [
	"address",
	"article",
	"aside",
	"blockquote",
	"details",
	"div",
	"dl",
	"fieldset",
	"figcaption",
	"figure",
	"footer",
	"form",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"header",
	"hgroup",
	"hr",
	"main",
	"menu",
	"nav",
	"ol",
	"p",
	"pre",
	"section",
	"table",
	"ul"
];

/** @type {[string, string[] | "p"][]} */
const OPTIONAL_END_TAG_FOLLOWERS = [
	["li", ["li"]],
	["dt", ["dt", "dd"]],
	["dd", ["dd", "dt"]],
	["rt", ["rt", "rp"]],
	["rp", ["rt", "rp"]],
	["optgroup", ["optgroup"]],
	["option", ["option", "optgroup"]],
	["thead", ["tbody", "tfoot"]],
	["tbody", ["tbody", "tfoot"]],
	["tfoot", []],
	["tr", ["tr"]],
	["td", ["td", "th"]],
	["th", ["td", "th"]],
	["p", "p"]
];

const OPTIONAL_END_TAG_UNLESS_TRAILING_NODE = ["caption", "colgroup"];

const OPTIONAL_END_TAG_AT_END = [
	"li",
	"dd",
	"rt",
	"rp",
	"optgroup",
	"option",
	"tbody",
	"tfoot",
	"tr",
	"td",
	"th",
	"p"
];

const P_KEEPS_END_TAG_IN = [
	"a",
	"audio",
	"del",
	"ins",
	"map",
	"noscript",
	"video"
];

const SRCSET_ATTRIBUTES = ["srcset", "imagesrcset"];

const COMMA_LIST_ATTRIBUTES = ["accept", "coords", "sizes"];

// Everything the IDL cannot state, each with why. The generator asserts that no
// entry here is also derivable, so one becoming so is a signal to delete it.
const SUPPLEMENT = {
	// `[CEReactions] attribute boolean async` carries no `Reflect`: the
	// force-async flag makes it more than a reflection.
	boolean: {
		async: ["script"],
		// Microdata lives in its own webref spec file, so this extraction misses it.
		itemscope: null
	},
	// Only `<link>`'s `href` is marked `ReflectURL`; `<a>` / `<area>` take theirs
	// from the `HTMLHyperlinkElementUtils` mixin and `<base>` from prose, and
	// `action` / `formaction` / `manifest` carry no URL marker at all.
	url: {
		href: ["a", "area", "base"],
		action: ["form"],
		formaction: ["button", "input"],
		manifest: ["html"]
	},
	// Not pure reflections on these elements — the IDL member resizes a bitmap or
	// drives a plugin — so they carry no marker.
	integer: {
		width: ["canvas", "embed", "iframe", "object"],
		height: ["canvas", "embed", "iframe", "object"]
	},
	signedInteger: [],
	// Only five attributes reflect as a `DOMTokenList`; the rest are ordered sets
	// the spec describes in prose.
	tokenList: {
		accesskey: null,
		class: null,
		headers: ["td", "th"],
		itemprop: null,
		itemref: null,
		itemtype: null,
		part: null,
		ping: ["a", "area"]
	}
};

/**
 * @param {{ [attribute: string]: string[] | null }} derived what the IDL states
 * @param {{ [attribute: string]: string[] | null }} supplement what it cannot
 * @param {string} group the table's name, for the error message
 * @returns {[string, string[] | null][]} the merged table, sorted
 */
const merge = (derived, supplement, group) => {
	/** @type {Map<string, string[] | null>} */
	const out = new Map(Object.entries(derived));
	for (const [attribute, on] of Object.entries(supplement)) {
		const already = out.get(attribute);
		if (already === undefined) {
			out.set(attribute, on);
			continue;
		}
		if (already === null || on === null) {
			throw new Error(
				`${group}.${attribute} is now derivable from the IDL — drop it from SUPPLEMENT`
			);
		}
		const extra = on.filter((element) => !already.includes(element));
		if (extra.length === 0) {
			throw new Error(
				`${group}.${attribute} adds nothing the IDL does not state — drop it from SUPPLEMENT`
			);
		}
		out.set(attribute, [...already, ...extra].sort());
	}
	return [...out].sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

const reflect = fetchSource
	? { boolean: {}, url: {}, integer: {}, tokenList: {}, signedInteger: [] }
	: JSON.parse(fs.readFileSync(REFLECT_PATH, "utf8"));
const booleans = merge(reflect.boolean, SUPPLEMENT.boolean, "boolean");
const urls = merge(reflect.url, SUPPLEMENT.url, "url");
const integers = merge(reflect.integer, SUPPLEMENT.integer, "integer");
const tokenLists = merge(reflect.tokenList, SUPPLEMENT.tokenList, "tokenList");
const signed = [
	...new Set([...reflect.signedInteger, ...SUPPLEMENT.signedInteger])
].sort();

/**
 * @param {[string, string[] | null][]} entries the table
 * @returns {string} its `new Map([...])` literal
 */
const mapLiteral = (entries) =>
	`new Map([${entries
		.map(
			([attribute, on]) =>
				`["${attribute}", ${on === null ? "null" : setLiteral(on)}]`
		)
		.join(", ")}])`;

/**
 * @param {string[]} names the members
 * @returns {string} its `new Set([...])` literal — prettier wraps it on emit
 */
const setLiteral = (names) =>
	names.length === 0
		? "new Set()"
		: `new Set([${names.map((name) => `"${name}"`).join(", ")}])`;

// The §13.1.2.4 optional-tag conditions and the value grammars below are prose
// in every source — no dataset states "a `<p>` end tag may be omitted in front
// of these" or "this attribute's value is a srcset" — so they stay written out.
const source = `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// GENERATED by tooling/generate-html-data.js — do not edit.
// Reflected-attribute tables from ${REFLECT_SOURCE}; everything else is the
// generator's SUPPLEMENT, which carries the spec facts no dataset states.

/**
 * §13.1.2.4: the elements a \`<p>\` end tag may be omitted in front of.
 * @type {Set<string>}
 */
const P_FOLLOWED_BY = ${setLiteral(P_FOLLOWED_BY)};

/**
 * §13.1.2.4: the element names whose end tag may be omitted when the next
 * sibling is one of the mapped names. \`<html>\`, \`<head>\` and \`<body>\` are
 * deliberately absent — their end tags are omissible too, but non-browser
 * consumers routinely mis-parse a document that is missing them.
 * @type {Map<string, Set<string>>}
 */
const OPTIONAL_END_TAG_FOLLOWERS = new Map([${OPTIONAL_END_TAG_FOLLOWERS.map(
	([name, followers]) =>
		`["${name}", ${followers === "p" ? "P_FOLLOWED_BY" : setLiteral(followers)}]`
).join(", ")}]);

/**
 * §13.1.2.4: the elements whose end tag may be omitted unless ASCII whitespace
 * or a comment follows. A different condition from the follower-set rule above:
 * what closes these is the insertion mode, whatever the next element is, so only
 * a node that would move inside them keeps the tag.
 * @type {Set<string>}
 */
const OPTIONAL_END_TAG_UNLESS_TRAILING_NODE = ${setLiteral(OPTIONAL_END_TAG_UNLESS_TRAILING_NODE)};

/**
 * The subset of \`OPTIONAL_END_TAG_FOLLOWERS\` that may also drop the end tag with
 * nothing left in the parent. \`<dt>\` and \`<thead>\` are absent: the spec gives
 * them no such clause.
 * @type {Set<string>}
 */
const OPTIONAL_END_TAG_AT_END = ${setLiteral(OPTIONAL_END_TAG_AT_END)};

/**
 * §13.1.2.4: a trailing \`</p>\` stays inside these, whose content model would
 * otherwise absorb what follows.
 * @type {Set<string>}
 */
const P_KEEPS_END_TAG_IN = ${setLiteral(P_KEEPS_END_TAG_IN)};

/**
 * §2.4.2 boolean attributes, mapped to the elements each one is boolean *on*
 * (\`null\` = a global attribute). Elsewhere the same name is an ordinary
 * attribute whose value a script may read.
 * @type {Map<string, Set<string> | null>}
 */
const BOOLEAN_ATTRIBUTES = ${mapLiteral(booleans)};

/**
 * The attributes whose value is a srcset (WHATWG "parse a srcset attribute").
 * @type {Set<string>}
 */
const SRCSET_ATTRIBUTES = ${setLiteral(SRCSET_ATTRIBUTES)};

/**
 * The attributes whose value is an ASCII-whitespace-separated token list, mapped
 * to the elements they are one on (\`null\` = a global attribute), so collapsing
 * the separators keeps the set the DOM reads. The element matters: \`for\` is a
 * token list on \`<output>\` but one id on \`<label>\`, and an id may contain a
 * space; \`sizes\` is one on \`<link>\` but a source-size list on \`<img>\`.
 * @type {Map<string, Set<string> | null>}
 */
const TOKEN_LIST_ATTRIBUTES = ${mapLiteral(tokenLists)};

/**
 * Attributes parsed as a URL, mapped to the elements they are one on. The URL
 * parser strips leading and trailing C0 controls and spaces, so trimming the
 * ASCII whitespace among them resolves to the same URL.
 * @type {Map<string, Set<string> | null>}
 */
const URL_ATTRIBUTES = ${mapLiteral(urls)};

/**
 * Attributes parsed with the integer rules, mapped to the elements they are one
 * on (\`null\` = a global attribute). Those rules skip leading whitespace and
 * stop at the first non-digit, so trimming and dropping leading zeros parse the
 * same. \`width\` / \`height\` are absent on \`<td>\` and \`<table>\`, where the
 * legacy dimension grammar also admits a percentage.
 * @type {Map<string, Set<string> | null>}
 */
const INTEGER_ATTRIBUTES = ${mapLiteral(integers)};

/**
 * The subset of \`INTEGER_ATTRIBUTES\` parsed with the "rules for parsing
 * integers" rather than the non-negative ones — only those accept a \`+\` or
 * \`-\`, so elsewhere a signed value does not parse at all and has to stand.
 * @type {Set<string>}
 */
const SIGNED_INTEGER_ATTRIBUTES = ${setLiteral(signed)};

/**
 * Attributes whose value is a comma-separated list, so the whitespace around
 * each comma and around the ends carries nothing. Whitespace *inside* an item is
 * never dropped: it belongs to the token \`accept\` keeps, separates numbers in
 * \`coords\`, and carries the media condition in \`sizes\`.
 * @type {Set<string>}
 */
const COMMA_LIST_ATTRIBUTES = ${setLiteral(COMMA_LIST_ATTRIBUTES)};

module.exports.BOOLEAN_ATTRIBUTES = BOOLEAN_ATTRIBUTES;
module.exports.COMMA_LIST_ATTRIBUTES = COMMA_LIST_ATTRIBUTES;
module.exports.INTEGER_ATTRIBUTES = INTEGER_ATTRIBUTES;
module.exports.OPTIONAL_END_TAG_AT_END = OPTIONAL_END_TAG_AT_END;
module.exports.OPTIONAL_END_TAG_FOLLOWERS = OPTIONAL_END_TAG_FOLLOWERS;
module.exports.OPTIONAL_END_TAG_UNLESS_TRAILING_NODE =
	OPTIONAL_END_TAG_UNLESS_TRAILING_NODE;
module.exports.P_FOLLOWED_BY = P_FOLLOWED_BY;
module.exports.P_KEEPS_END_TAG_IN = P_KEEPS_END_TAG_IN;
module.exports.SIGNED_INTEGER_ATTRIBUTES = SIGNED_INTEGER_ATTRIBUTES;
module.exports.SRCSET_ATTRIBUTES = SRCSET_ATTRIBUTES;
module.exports.TOKEN_LIST_ATTRIBUTES = TOKEN_LIST_ATTRIBUTES;
module.exports.URL_ATTRIBUTES = URL_ATTRIBUTES;
`;

const summary = `${booleans.length} boolean, ${urls.length} url, ${integers.length} integer (${signed.length} signed), ${tokenLists.length} token-list attributes`;

// `--fetch` only refreshes the vendored extraction; the emit runs on its own.
if (!fetchSource) {
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
				process.stdout.write(`lib/html/data.js is up to date (${summary})\n`);
			} else if (write) {
				fs.writeFileSync(TARGET, formatted);
				process.stdout.write(`lib/html/data.js updated (${summary})\n`);
			} else {
				process.stdout.write(
					"lib/html/data.js is out of date — run `yarn fix:special`\n"
				);
				process.exitCode = 1;
			}
		});
}
