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
	/**
	 * @param {{ [attribute: string]: string[] | null }} table one group
	 * @returns {{ [attribute: string]: string[] | null }} it, by name
	 */
	const byName = (table) => {
		/** @type {{ [attribute: string]: string[] | null }} */
		const sorted = {};
		for (const name of Object.keys(table).sort()) sorted[name] = table[name];
		return sorted;
	};
	return {
		source: { idl: IDL_URL, elements: ELEMENTS_URL },
		boolean: byName(out.boolean),
		url: byName(out.url),
		integer: byName(out.integer),
		signedInteger: [...signed].filter((a) => !nonNegative.has(a)).sort(),
		tokenList: byName(out.tokenList)
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
			`${path.relative(
				path.resolve(__dirname, ".."),
				REFLECT_PATH
			)} refreshed\n`
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

// Cannot be derived: §13.2.6.4.7 states per end tag whether it generates implied
// end tags, as prose on each rule rather than as a list any dataset carries, and
// the table modes close a `p` through their own rules on top of it. Confirmed
// element by element against a real engine. §13.1.2.4 names the complement
// (a, audio, del, ins, map, noscript, video), which reads as closed and is not:
// every other non-special parent — `canvas`, `span`, every custom element —
// keeps an open `p` open too, because "any other end tag" ignores its own token
// once a special element sits above it.
const P_ENDS_ON_PARENT_END_TAG = [
	"address",
	"applet",
	"article",
	"aside",
	"blockquote",
	"body",
	"button",
	"caption",
	"center",
	"colgroup",
	"dd",
	"details",
	"dialog",
	"dir",
	"div",
	"dl",
	"dt",
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
	"head",
	"header",
	"hgroup",
	"html",
	"li",
	"listing",
	"main",
	"marquee",
	"menu",
	"nav",
	"object",
	"ol",
	"pre",
	"search",
	"section",
	"select",
	"summary",
	"table",
	"tbody",
	"td",
	"template",
	"tfoot",
	"th",
	"thead",
	"tr",
	"ul"
];

const BODY_START_KEPT_BEFORE = [
	"link",
	"meta",
	"noscript",
	"script",
	"style",
	"template"
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
	},
	// Also reflected as a `DOMTokenList`, but by a member the extraction cannot
	// see: `classList` and `part` belong to DOM's `Element`, and the microdata
	// three carry `[PutForwards]` rather than a `Reflect` marker.
	domTokenList: ["class", "itemprop", "itemref", "itemtype", "part"]
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
	? {
			boolean: {},
			url: {},
			integer: {},
			tokenList: {},
			signedInteger: []
		}
	: JSON.parse(fs.readFileSync(REFLECT_PATH, "utf8"));
const booleans = merge(reflect.boolean, SUPPLEMENT.boolean, "boolean");
const urls = merge(reflect.url, SUPPLEMENT.url, "url");
const integers = merge(reflect.integer, SUPPLEMENT.integer, "integer");
const tokenLists = merge(reflect.tokenList, SUPPLEMENT.tokenList, "tokenList");
// Derived: the lists a repeated token may be dropped from are the ones the DOM
// itself folds, which is exactly the `DOMTokenList` reflections.
const domTokenLists = [
	...new Set([...Object.keys(reflect.tokenList), ...SUPPLEMENT.domTokenList])
].sort();
for (const name of domTokenLists) {
	if (!tokenLists.some(([listName]) => listName === name)) {
		throw new Error(`domTokenList.${name} is not a token list at all`);
	}
}
const signed = [
	...new Set([...reflect.signedInteger, ...SUPPLEMENT.signedInteger])
].sort();

// §13.2 tree-construction vocabulary: the tag-name groups the insertion modes
// test membership in, and the name maps foreign content is adjusted with. Spec
// prose, so they are written out — no dataset states them. Sets rather than
// arrays because the tree builder runs these tests per token on hot paths.
/** @typedef {[string, "set" | "array" | "object" | "map" | "byElement" | "byElementSet", string, (string | [string, string] | [string, string[] | null])[]]} ParserTable a name, its literal kind, its doc line and its members */
/** @type {ParserTable[]} */
const PARSER_TABLES = [
	[
		"VOID",
		"set",
		"§13.1.2 void elements: no end tag, and no children to close one over.",
		[
			"area",
			"base",
			"br",
			"col",
			"embed",
			"hr",
			"img",
			"input",
			"keygen",
			"link",
			"meta",
			"param",
			"source",
			"track",
			"wbr"
		]
	],
	[
		"SPECIAL",
		"set",
		'§13.2.4.2\'s "special" category — the elements the adoption agency and the scope tests treat as barriers.',
		[
			"address",
			"applet",
			"area",
			"article",
			"aside",
			"base",
			"basefont",
			"bgsound",
			"blockquote",
			"body",
			"br",
			"button",
			"caption",
			"center",
			"col",
			"colgroup",
			"dd",
			"details",
			"dir",
			"div",
			"dl",
			"dt",
			"embed",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"form",
			"frame",
			"frameset",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"header",
			"hgroup",
			"hr",
			"html",
			"iframe",
			"img",
			"input",
			"keygen",
			"li",
			"link",
			"listing",
			"main",
			"marquee",
			"menu",
			"meta",
			"nav",
			"noembed",
			"noframes",
			"noscript",
			"object",
			"ol",
			"p",
			"param",
			"plaintext",
			"pre",
			"script",
			"search",
			"section",
			"select",
			"source",
			"style",
			"summary",
			"table",
			"tbody",
			"td",
			"template",
			"textarea",
			"tfoot",
			"th",
			"thead",
			"title",
			"tr",
			"track",
			"ul",
			"wbr",
			"xmp"
		]
	],
	[
		"FORMATTING",
		"set",
		"§13.2.4.3 formatting elements: the ones reconstructed from the list of active formatting elements.",
		[
			"a",
			"b",
			"big",
			"code",
			"em",
			"font",
			"i",
			"nobr",
			"s",
			"small",
			"strike",
			"strong",
			"tt",
			"u"
		]
	],
	[
		"HEADING",
		"set",
		"The heading elements, whose start tag closes an open one.",
		["h1", "h2", "h3", "h4", "h5", "h6"]
	],
	[
		"SVG_TAG_ADJUST",
		"object",
		'§13.2.6.5 "adjust SVG tag name": lowercased source name -> the camelCased SVG name.',
		[
			["altglyph", "altGlyph"],
			["altglyphdef", "altGlyphDef"],
			["altglyphitem", "altGlyphItem"],
			["animatecolor", "animateColor"],
			["animatemotion", "animateMotion"],
			["animatetransform", "animateTransform"],
			["clippath", "clipPath"],
			["feblend", "feBlend"],
			["fecolormatrix", "feColorMatrix"],
			["fecomponenttransfer", "feComponentTransfer"],
			["fecomposite", "feComposite"],
			["feconvolvematrix", "feConvolveMatrix"],
			["fediffuselighting", "feDiffuseLighting"],
			["fedisplacementmap", "feDisplacementMap"],
			["fedistantlight", "feDistantLight"],
			["fedropshadow", "feDropShadow"],
			["feflood", "feFlood"],
			["fefunca", "feFuncA"],
			["fefuncb", "feFuncB"],
			["fefuncg", "feFuncG"],
			["fefuncr", "feFuncR"],
			["fegaussianblur", "feGaussianBlur"],
			["feimage", "feImage"],
			["femerge", "feMerge"],
			["femergenode", "feMergeNode"],
			["femorphology", "feMorphology"],
			["feoffset", "feOffset"],
			["fepointlight", "fePointLight"],
			["fespecularlighting", "feSpecularLighting"],
			["fespotlight", "feSpotLight"],
			["fetile", "feTile"],
			["feturbulence", "feTurbulence"],
			["foreignobject", "foreignObject"],
			["glyphref", "glyphRef"],
			["lineargradient", "linearGradient"],
			["radialgradient", "radialGradient"],
			["textpath", "textPath"]
		]
	],
	[
		"SVG_ATTR_ADJUST",
		"object",
		'§13.2.6.1 "adjust SVG attributes": lowercased source name -> the camelCased SVG attribute.',
		[
			["attributename", "attributeName"],
			["attributetype", "attributeType"],
			["basefrequency", "baseFrequency"],
			["baseprofile", "baseProfile"],
			["calcmode", "calcMode"],
			["clippathunits", "clipPathUnits"],
			["diffuseconstant", "diffuseConstant"],
			["edgemode", "edgeMode"],
			["filterunits", "filterUnits"],
			["glyphref", "glyphRef"],
			["gradienttransform", "gradientTransform"],
			["gradientunits", "gradientUnits"],
			["kernelmatrix", "kernelMatrix"],
			["kernelunitlength", "kernelUnitLength"],
			["keypoints", "keyPoints"],
			["keysplines", "keySplines"],
			["keytimes", "keyTimes"],
			["lengthadjust", "lengthAdjust"],
			["limitingconeangle", "limitingConeAngle"],
			["markerheight", "markerHeight"],
			["markerunits", "markerUnits"],
			["markerwidth", "markerWidth"],
			["maskcontentunits", "maskContentUnits"],
			["maskunits", "maskUnits"],
			["numoctaves", "numOctaves"],
			["pathlength", "pathLength"],
			["patterncontentunits", "patternContentUnits"],
			["patterntransform", "patternTransform"],
			["patternunits", "patternUnits"],
			["pointsatx", "pointsAtX"],
			["pointsaty", "pointsAtY"],
			["pointsatz", "pointsAtZ"],
			["preservealpha", "preserveAlpha"],
			["preserveaspectratio", "preserveAspectRatio"],
			["primitiveunits", "primitiveUnits"],
			["refx", "refX"],
			["refy", "refY"],
			["repeatcount", "repeatCount"],
			["repeatdur", "repeatDur"],
			["requiredextensions", "requiredExtensions"],
			["requiredfeatures", "requiredFeatures"],
			["specularconstant", "specularConstant"],
			["specularexponent", "specularExponent"],
			["spreadmethod", "spreadMethod"],
			["startoffset", "startOffset"],
			["stddeviation", "stdDeviation"],
			["stitchtiles", "stitchTiles"],
			["surfacescale", "surfaceScale"],
			["systemlanguage", "systemLanguage"],
			["tablevalues", "tableValues"],
			["targetx", "targetX"],
			["targety", "targetY"],
			["textlength", "textLength"],
			["viewbox", "viewBox"],
			["viewtarget", "viewTarget"],
			["xchannelselector", "xChannelSelector"],
			["ychannelselector", "yChannelSelector"],
			["zoomandpan", "zoomAndPan"]
		]
	],
	[
		"FOREIGN_ATTR_NS",
		"object",
		'§13.2.6.1 "adjust foreign attributes": the attributes serialized with a namespace prefix.',
		[
			["xlink:actuate", "xlink actuate"],
			["xlink:arcrole", "xlink arcrole"],
			["xlink:href", "xlink href"],
			["xlink:role", "xlink role"],
			["xlink:show", "xlink show"],
			["xlink:title", "xlink title"],
			["xlink:type", "xlink type"],
			["xml:lang", "xml lang"],
			["xml:space", "xml space"],
			["xmlns", "xmlns"],
			["xmlns:xlink", "xmlns xlink"]
		]
	],
	[
		"MATHML_TEXT_INTEGRATION",
		"set",
		"MathML text integration points (§13.2.6.5): HTML content resumes inside them.",
		["mi", "mo", "mn", "ms", "mtext"]
	],
	[
		"MATHML_SPECIAL",
		"set",
		"The MathML elements an HTML breakout pops back to.",
		["mi", "mo", "mn", "ms", "mtext", "annotation-xml"]
	],
	[
		"SVG_SPECIAL",
		"set",
		"HTML integration points in SVG (§13.2.6.5).",
		["foreignobject", "desc", "title"]
	],
	[
		"HTML_SCOPE",
		"set",
		'§13.2.4.2 "the stack of open elements has an element in scope": the elements that stop the walk.',
		[
			"applet",
			"caption",
			"html",
			"table",
			"td",
			"th",
			"marquee",
			"object",
			"template"
		]
	],
	[
		"IMPLIED",
		"set",
		'§13.2.6.4.7 "generate implied end tags": the elements popped without their end tag.',
		["dd", "dt", "li", "optgroup", "option", "p", "rb", "rp", "rt", "rtc"]
	],
	[
		"IMPLIED_THOROUGH",
		"set",
		'"generate all implied end tags thoroughly" — the wider list the table modes use.',
		[
			"caption",
			"colgroup",
			"dd",
			"dt",
			"li",
			"optgroup",
			"option",
			"p",
			"rb",
			"rp",
			"rt",
			"rtc",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr"
		]
	],
	[
		"CLEAR_TABLE",
		"set",
		'"clear the stack back to a table context" stops here.',
		["table", "template", "html"]
	],
	[
		"CLEAR_TABLE_BODY",
		"set",
		'"clear the stack back to a table body context" stops here.',
		["tbody", "tfoot", "thead", "template", "html"]
	],
	[
		"CLEAR_TABLE_ROW",
		"set",
		'"clear the stack back to a table row context" stops here.',
		["tr", "template", "html"]
	],
	[
		"TABLE_SCOPE_STOP",
		"set",
		'The table-scope barrier (§13.2.4.2 "has an element in table scope").',
		["html", "table", "template"]
	],
	[
		"TABLE_CONTEXT",
		"set",
		'The elements "in table" text is fostered out of.',
		["table", "tbody", "tfoot", "thead", "tr"]
	],
	[
		"TBODY_GROUP",
		"set",
		"The three row-group elements, interchangeable in the table modes.",
		["tbody", "tfoot", "thead"]
	],
	["TD_TH", "set", "The two cell elements.", ["td", "th"]],
	[
		"TD_TH_TR",
		"set",
		"The cell elements plus their row, closed together.",
		["td", "th", "tr"]
	],
	[
		"STYLE_SCRIPT_TEMPLATE",
		"set",
		'The head elements "in body" re-dispatches to "in head".',
		["style", "script", "template"]
	],
	[
		"HEAD_BODY_HTML_BR",
		"set",
		'The end tags "after head" / "before head" act on rather than ignore.',
		["head", "body", "html", "br"]
	],
	[
		"BODY_HTML_BR",
		"set",
		'The end tags "after body" acts on rather than ignores.',
		["body", "html", "br"]
	],
	[
		"HEAD_VOID_ELEMENTS",
		"set",
		'Void elements "in head" inserts and immediately pops.',
		["base", "basefont", "bgsound", "link", "meta"]
	],
	[
		"NOFRAMES_STYLE_NOSCRIPT",
		"set",
		'The raw-text elements "in head" tokenizes as such.',
		["noframes", "style", "noscript"]
	],
	[
		"IN_HEAD_NOSCRIPT_PASSTHROUGH",
		"set",
		'"in head noscript" start tags handled by reprocessing in "in head".',
		["basefont", "bgsound", "link", "meta", "noframes", "style"]
	],
	[
		"HEAD_ELEMENTS",
		"set",
		"The elements that belong in `<head>`.",
		[
			"base",
			"basefont",
			"bgsound",
			"link",
			"meta",
			"noframes",
			"script",
			"style",
			"template",
			"title"
		]
	],
	[
		"BLOCK_START",
		"set",
		'Start tags "in body" closes an open `<p>` before inserting.',
		[
			"address",
			"article",
			"aside",
			"blockquote",
			"center",
			"details",
			"dialog",
			"dir",
			"div",
			"dl",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"header",
			"hgroup",
			"main",
			"menu",
			"nav",
			"ol",
			"p",
			"search",
			"section",
			"summary",
			"ul"
		]
	],
	[
		"BLOCK_END",
		"set",
		'End tags "in body" closes a block for — `BLOCK_START` plus the elements with no start-tag clause of their own.',
		[
			"address",
			"article",
			"aside",
			"blockquote",
			"button",
			"center",
			"details",
			"dialog",
			"dir",
			"div",
			"dl",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"header",
			"hgroup",
			"listing",
			"main",
			"menu",
			"nav",
			"ol",
			"pre",
			"search",
			"section",
			"summary",
			"ul"
		]
	],
	[
		"ADDRESS_DIV_P",
		"set",
		"The three elements `</form>` and the block end tags share a close path with.",
		["address", "div", "p"]
	],
	[
		"APPLET_MARQUEE_OBJECT",
		"set",
		"The elements that push a marker onto the list of active formatting elements.",
		["applet", "marquee", "object"]
	],
	[
		"VOID_FORMATTING",
		"set",
		'Void start tags "in body" that reconstruct the active formatting elements first.',
		["area", "br", "embed", "img", "keygen", "wbr"]
	],
	[
		"PARAM_SOURCE_TRACK",
		"set",
		'Void start tags "in body" that do not reconstruct.',
		["param", "source", "track"]
	],
	[
		"IGNORED_BODY_TABLE_STARTS",
		"set",
		'Table start tags "in body" ignores outside a table.',
		[
			"caption",
			"col",
			"colgroup",
			"frame",
			"head",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr"
		]
	],
	[
		"IN_TABLE_IGNORED_ENDS",
		"set",
		'End tags "in table" ignores.',
		[
			"body",
			"caption",
			"col",
			"colgroup",
			"html",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr"
		]
	],
	[
		"CAPTION_TABLE_STARTS",
		"set",
		'Start tags "in caption" closes the caption for.',
		["caption", "col", "colgroup", "tbody", "td", "tfoot", "th", "thead", "tr"]
	],
	[
		"CAPTION_IGNORED_ENDS",
		"set",
		'End tags "in caption" ignores.',
		[
			"body",
			"col",
			"colgroup",
			"html",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr"
		]
	],
	[
		"TBODY_TRIGGER_STARTS",
		"set",
		'Start tags "in table body" closes the row group for.',
		["caption", "col", "colgroup", "tbody", "tfoot", "thead"]
	],
	[
		"TBODY_IGNORED_ENDS",
		"set",
		'End tags "in table body" ignores.',
		["body", "caption", "col", "colgroup", "html", "td", "th", "tr"]
	],
	[
		"ROW_TRIGGER_STARTS",
		"set",
		'Start tags "in row" closes the row for.',
		["caption", "col", "colgroup", "tbody", "tfoot", "thead", "tr"]
	],
	[
		"ROW_IGNORED_ENDS",
		"set",
		'End tags "in row" ignores.',
		["body", "caption", "col", "colgroup", "html", "td", "th"]
	],
	[
		"CELL_IGNORED_ENDS",
		"set",
		'End tags "in cell" ignores.',
		["body", "caption", "col", "colgroup", "html"]
	],
	[
		"NO_DECODE_TEXT",
		"set",
		"Elements whose text is tokenized raw, so no character reference in it is decoded.",
		["script", "style", "xmp", "iframe", "noembed", "noframes", "plaintext"]
	],
	[
		"FOREIGN_BREAKOUT",
		"set",
		"HTML start tags that break out of foreign (SVG/MathML) content.",
		[
			"b",
			"big",
			"blockquote",
			"body",
			"br",
			"center",
			"code",
			"dd",
			"div",
			"dl",
			"dt",
			"em",
			"embed",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"head",
			"hr",
			"i",
			"img",
			"li",
			"listing",
			"menu",
			"meta",
			"nobr",
			"ol",
			"p",
			"pre",
			"ruby",
			"s",
			"small",
			"span",
			"strong",
			"strike",
			"sub",
			"sup",
			"table",
			"tt",
			"u",
			"ul",
			"var"
		]
	],
	[
		"FONT_BREAKOUT_ATTRS",
		"set",
		"The `<font>` attributes that make it break out of foreign content.",
		["color", "face", "size"]
	],
	[
		"RAW_TEXT_ELEMENTS",
		"set",
		"Raw text / escapable raw text elements (§13.1.2) plus the other RAWTEXT/RCDATA/PLAINTEXT-tokenized ones.",
		[
			"script",
			"style",
			"textarea",
			"title",
			"xmp",
			"iframe",
			"noembed",
			"noframes",
			"noscript",
			"plaintext"
		]
	],
	[
		"QUIRKY_PREFIXES",
		"array",
		'Public-id prefixes that force quirks mode (the "quirks mode" doctype table).',
		[
			"+//silmaril//dtd html pro v0r11 19970101//",
			"-//as//dtd html 3.0 aswedit + extensions//",
			"-//advasoft ltd//dtd html 3.0 aswedit + extensions//",
			"-//ietf//dtd html 2.0 level 1//",
			"-//ietf//dtd html 2.0 level 2//",
			"-//ietf//dtd html 2.0 strict level 1//",
			"-//ietf//dtd html 2.0 strict level 2//",
			"-//ietf//dtd html 2.0 strict//",
			"-//ietf//dtd html 2.0//",
			"-//ietf//dtd html 2.1e//",
			"-//ietf//dtd html 3.0//",
			"-//ietf//dtd html 3.2 final//",
			"-//ietf//dtd html 3.2//",
			"-//ietf//dtd html 3//",
			"-//ietf//dtd html level 0//",
			"-//ietf//dtd html level 1//",
			"-//ietf//dtd html level 2//",
			"-//ietf//dtd html level 3//",
			"-//ietf//dtd html strict level 0//",
			"-//ietf//dtd html strict level 1//",
			"-//ietf//dtd html strict level 2//",
			"-//ietf//dtd html strict level 3//",
			"-//ietf//dtd html strict//",
			"-//ietf//dtd html//",
			"-//metrius//dtd metrius presentational//",
			"-//microsoft//dtd internet explorer 2.0 html strict//",
			"-//microsoft//dtd internet explorer 2.0 html//",
			"-//microsoft//dtd internet explorer 2.0 tables//",
			"-//microsoft//dtd internet explorer 3.0 html strict//",
			"-//microsoft//dtd internet explorer 3.0 html//",
			"-//microsoft//dtd internet explorer 3.0 tables//",
			"-//netscape comm. corp.//dtd html//",
			"-//netscape comm. corp.//dtd strict html//",
			"-//o'reilly and associates//dtd html 2.0//",
			"-//o'reilly and associates//dtd html extended 1.0//",
			"-//o'reilly and associates//dtd html extended relaxed 1.0//",
			"-//sq//dtd html 2.0 hotmetal + extensions//",
			"-//softquad software//dtd hotmetal pro 6.0::19990601::extensions to html 4.0//",
			"-//softquad//dtd hotmetal pro 4.0::19971010::extensions to html 4.0//",
			"-//spyglass//dtd html 2.0 extended//",
			"-//sun microsystems corp.//dtd hotjava html//",
			"-//sun microsystems corp.//dtd hotjava strict html//",
			"-//w3c//dtd html 3 1995-03-24//",
			"-//w3c//dtd html 3.2 draft//",
			"-//w3c//dtd html 3.2 final//",
			"-//w3c//dtd html 3.2//",
			"-//w3c//dtd html 3.2s draft//",
			"-//w3c//dtd html 4.0 frameset//",
			"-//w3c//dtd html 4.0 transitional//",
			"-//w3c//dtd html experimental 19960712//",
			"-//w3c//dtd html experimental 970421//",
			"-//w3c//dtd w3 html//",
			"-//w3o//dtd w3 html 3.0//",
			"-//webtechs//dtd mozilla html 2.0//",
			"-//webtechs//dtd mozilla html//"
		]
	],
	[
		"QUIRKY_EXACT",
		"set",
		"Public ids that force quirks mode exactly.",
		[
			"-//w3o//dtd w3 html strict 3.0//en//",
			"-/w3c/dtd html 4.0 transitional/en",
			"html"
		]
	],
	[
		"LITERAL_TEXT_PARENTS",
		"set",
		"Elements whose text children serialize literally, no escaping. `textarea` / `title` are escapable, so they are not here.",
		["script", "style", "xmp", "iframe", "noembed", "noframes", "plaintext"]
	],
	[
		"TRANSPARENT_IMPLIED_ELEMENTS",
		"set",
		"The only elements the printer may leave transparent when they lack a source tag: the parser re-implies them identically. Any other tag-less element (adoption-agency clone, reconstructed formatting element, renamed token) must be materialized or the DOM changes.",
		["html", "head", "body", "colgroup", "tbody", "tr"]
	],
	[
		"LEADING_NEWLINE_ELEMENTS",
		"set",
		"Elements the parser strips one leading newline from, so a serialized body that still begins with one needs it re-added.",
		["pre", "textarea", "listing"]
	],
	[
		"JSON_SCRIPT_TYPES",
		"set",
		"`<script>` bodies that are JSON: the two dedicated types plus any `+json` subtype (`application/ld+json`).",
		["application/json", "importmap", "speculationrules"]
	],
	[
		"TEMPLATE_START_TAG_MODES",
		"object",
		'§13.2.6.4.18 "in template": the start tags that re-dispatch, each to the insertion mode it switches to. Named, not numbered — the numbering is the parser\'s own, so `syntax.js` binds these names to its constants.',
		[
			["caption", "IN_TABLE"],
			["colgroup", "IN_TABLE"],
			["tbody", "IN_TABLE"],
			["tfoot", "IN_TABLE"],
			["thead", "IN_TABLE"],
			["col", "IN_COLUMN_GROUP"],
			["tr", "IN_TABLE_BODY"],
			["td", "IN_ROW"],
			["th", "IN_ROW"]
		]
	],
	// §15 "Rendering" gives these a non-inline default display, so whitespace at
	// their edge sits outside every line box and renders as nothing. Spec prose
	// — the rendering section is a stylesheet written out in the text, and no
	// dataset states it — and only the default matters here: a page restyling
	// `div { display: inline }` is why `collapseWhitespace: "smart"` is opt-in.
	[
		"BLOCK_LEVEL_ELEMENTS",
		"set",
		'Elements §15 gives a non-inline default display. Whitespace against one of their edges renders as nothing, which is what `collapseWhitespace: "smart"` drops. Author CSS can still make one inline, so the mode is opt-in.',
		[
			"address",
			"article",
			"aside",
			"blockquote",
			"body",
			"caption",
			"center",
			"col",
			"colgroup",
			"dd",
			"details",
			"dialog",
			"dir",
			"div",
			"dl",
			"dt",
			"fieldset",
			"figcaption",
			"figure",
			"footer",
			"form",
			"frameset",
			"h1",
			"h2",
			"h3",
			"h4",
			"h5",
			"h6",
			"header",
			"hgroup",
			"hr",
			"html",
			"legend",
			"li",
			"listing",
			"main",
			"marquee",
			"menu",
			"nav",
			"ol",
			"optgroup",
			"option",
			"p",
			"plaintext",
			"pre",
			"search",
			"section",
			"summary",
			"table",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr",
			"ul",
			"xmp"
		]
	],
	// The enumerated attributes, each with the keywords the spec gives it. Spec
	// prose: nothing in the IDL marks an attribute as enumerated, and no dataset
	// states a keyword set, so this is written out — but only a value that *is*
	// one of the keywords is folded, which is what keeps a case-sensitive value
	// nobody enumerated (`target="MyFrame"`, a custom `type`) exactly as written.
	//
	// `<ol type>` is deliberately absent: `a` and `A` are two different keywords
	// there, so folding one into the other renumbers the list. `sizes` and
	// `media` are absent because neither is enumerated at all.
	//
	// So are `target` / `formtarget`, `<area shape>` and `<textarea wrap>`: their
	// IDL members reflect the value verbatim rather than "limited to only known
	// values", so the engine hands a script back the case it was written in and
	// folding it is a change something can read.
	[
		"ENUMERATED_KEYWORDS",
		"byElementSet",
		"element -> attribute -> the keywords the spec enumerates for it, matched ASCII-case-insensitively. `*` holds the global attributes. Only a value already in the set is folded to lower case, so a spelling the spec does not enumerate keeps its case.",
		[
			["* autocapitalize", "none off on sentences words characters"],
			["* contenteditable", "true false plaintext-only"],
			["* dir", "ltr rtl auto"],
			["* draggable", "true false"],
			["* enterkeyhint", "enter done go next previous search send"],
			["* hidden", "hidden until-found"],
			["* inputmode", "none text tel url email numeric decimal search"],
			["* popover", "auto manual hint"],
			[
				"* referrerpolicy",
				"no-referrer no-referrer-when-downgrade same-origin origin strict-origin origin-when-cross-origin strict-origin-when-cross-origin unsafe-url"
			],
			["* spellcheck", "true false"],
			["* translate", "yes no"],
			["* writingsuggestions", "true false"],
			["audio crossorigin", "anonymous use-credentials"],
			["audio preload", "none metadata auto"],
			[
				"button formenctype",
				"application/x-www-form-urlencoded multipart/form-data text/plain"
			],
			["button formmethod", "get post dialog"],
			["button type", "submit reset button"],
			["form autocomplete", "on off"],
			[
				"form enctype",
				"application/x-www-form-urlencoded multipart/form-data text/plain"
			],
			["form method", "get post dialog"],
			["iframe loading", "lazy eager"],
			["img crossorigin", "anonymous use-credentials"],
			["img decoding", "sync async auto"],
			["img fetchpriority", "high low auto"],
			["img loading", "lazy eager"],
			[
				"input formenctype",
				"application/x-www-form-urlencoded multipart/form-data text/plain"
			],
			["input formmethod", "get post dialog"],
			[
				"input type",
				"hidden text search tel url email password date month week time datetime-local number range color checkbox radio file submit image reset button"
			],
			["link crossorigin", "anonymous use-credentials"],
			["link fetchpriority", "high low auto"],
			["script crossorigin", "anonymous use-credentials"],
			["script fetchpriority", "high low auto"],
			["td scope", "row col rowgroup colgroup"],
			["th scope", "row col rowgroup colgroup"],
			["track kind", "subtitles captions descriptions chapters metadata"],
			["video crossorigin", "anonymous use-credentials"],
			["video preload", "none metadata auto"]
		]
	],
	// Elements `removeEmptyElements` keeps even with no children and no
	// attributes, because that is their ordinary form rather than a leftover.
	// The option's other guards are rules, not names: a void element is always
	// childless, a foreign one is not ours to judge, and an element carrying any
	// attribute at all was written for a reason (which is what covers
	// `<script src>`, `<iframe src>`, `<div id=mount>` and `<div class=spacer>`,
	// each of which html-minifier-terser drops).
	[
		"EMPTY_ELEMENT_KEPT",
		"set",
		"Elements `removeEmptyElements` never drops: with no children and no attributes each is still doing its job, so an empty one is not a leftover.",
		[
			// Drawn into by script, and found by tag name.
			"canvas",
			// Filled and opened by script.
			"dialog",
			// A gauge reads its value off an attribute; bare, it is still a gauge.
			"meter",
			// Form-associated and written to by script.
			"output",
			"progress",
			// The default slot, which is exactly the one with no name.
			"slot",
			// Its children hang off a content fragment, not off it.
			"template",
			// Empty is a valid value, and its own end tag is what delimits it.
			"textarea",
			// Table shape: dropping a cell or a row shifts every one after it.
			"caption",
			"col",
			"colgroup",
			"table",
			"tbody",
			"td",
			"tfoot",
			"th",
			"thead",
			"tr"
		]
	],
	// Global attributes whose empty value is the state the spec gives their
	// absence, so `removeEmptyAttributes` may drop them. Deliberately short:
	// `title=""` and `lang=""` look like members and are not, because the spec
	// gives each of them a meaning absence does not have — an empty `title` says
	// the element has no advisory information, overriding an ancestor's, and an
	// empty `lang` says the language is unknown rather than inherited. Every
	// other minifier drops both. `href` / `src` / `action` are out for the same
	// reason: an empty URL resolves to the document's own address, which is not
	// what no URL at all does.
	[
		"EMPTY_REMOVABLE_ATTRIBUTES",
		"map",
		'Attributes `removeEmptyAttributes` may drop when their value is empty or all whitespace, mapped to the elements they mean that on (`null` = a global attribute): the spec gives each the same state empty and absent. Four hand-reasoned globals, plus every token-list attribute (no tokens is what absence gives). The element matters — on any element the spec does not define it for, `rel` or `headers` is an ordinary author attribute a script reads back, so `<x-foo rel="">` keeps it. `sandbox` is the token list held back: its empty list is the most restrictive state an `<iframe>` has. Only a presence selector (`[class]`) or a script reading the attribute back can tell, which is what keeps the option off by default.',
		[
			// No classes either way; `classList` is empty and nothing matches.
			["class", null],
			// `dir` is enumerated, and both its invalid and missing value defaults
			// are the same undefined state.
			["dir", null],
			// No id either way: `getElementById("")` matches nothing.
			["id", null],
			// An empty declaration list contributes nothing to the cascade.
			["style", null]
		]
	],
	[
		"REDUNDANT_TYPE_ATTRIBUTES",
		"byElement",
		'element -> attribute -> the value that states the element\'s own default, for `removeRedundantAttributes: "smart"` (the default). Grouped by element so the printer gates on one lookup for an element no entry names, which is nearly every attribute it prints. Only markers on elements that render nothing, so no rule that styles the page stops applying — unlike `input[type=text]`, which is why that tier is separate. A `querySelector` naming one of these can still tell it went. `media` defaults to `all`, and a `<script charset>` matching the document encoding is obsolete and ignored. Matched ASCII-case-insensitively, unlike `@swc/html`, which lowercases `type` but not `media` / `charset`. `<script type>` is not here — its redundant values are `JAVASCRIPT_SCRIPT_TYPES` minus the empty and `module` spellings, which mean something.',
		[
			["style type", "text/css"],
			["link type", "text/css"],
			["link media", "all"],
			["script language", "javascript"],
			// The attribute value the spec spells, not a Node encoding identifier.
			// eslint-disable-next-line unicorn/text-encoding-identifier-case
			["script charset", "utf-8"]
		]
	],
	[
		"REDUNDANT_DEFAULT_ATTRIBUTES",
		"byElement",
		'element -> attribute -> the value the element already defaults to, for `removeRedundantAttributes: "all"`, grouped like `REDUNDANT_TYPE_ATTRIBUTES`. Dropping these is what makes the option unsafe: an attribute selector matches the content attribute, not the reflected default, so `input[type=text]` stops matching. Spec defaults, which the IDL does not state.',
		[
			["input type", "text"],
			["form method", "get"],
			["form enctype", "application/x-www-form-urlencoded"],
			["button type", "submit"],
			["area shape", "rect"],
			["textarea wrap", "soft"],
			["track kind", "subtitles"],
			["col span", "1"],
			["colgroup span", "1"],
			["td colspan", "1"],
			["td rowspan", "1"],
			["th colspan", "1"],
			["th rowspan", "1"]
		]
	],
	[
		"JAVASCRIPT_SCRIPT_TYPES",
		"set",
		"`<script>` `type` values that make the body executable JavaScript, per the spec's JavaScript MIME type essence list plus the empty and `module` spellings. Anything else is a data block, which must pass through as an asset rather than be bundled as an entry. The IDL says nothing about MIME essences, so this cannot be read out of webref.",
		[
			"",
			"module",
			"application/ecmascript",
			"application/javascript",
			"application/x-ecmascript",
			"application/x-javascript",
			"text/ecmascript",
			"text/javascript",
			"text/javascript1.0",
			"text/javascript1.1",
			"text/javascript1.2",
			"text/javascript1.3",
			"text/javascript1.4",
			"text/javascript1.5",
			"text/jscript",
			"text/livescript",
			"text/x-ecmascript",
			"text/x-javascript"
		]
	]
];

// Derived: just the names in `ENUMERATED_KEYWORDS`, so the printer can rule an
// attribute out with one lookup instead of two — nearly every attribute it sees
// enumerates nothing.
const ENUMERATED_ATTRIBUTE_NAMES = [
	...new Set(
		/** @type {[string, string][]} */
		(
			/** @type {ParserTable} */
			(
				/** @type {ParserTable[]} */ (PARSER_TABLES).find(
					([name]) => name === "ENUMERATED_KEYWORDS"
				)
			)[3]
		).map(([key]) => key.slice(key.indexOf(" ") + 1))
	)
].sort();

// Derived: every attribute name any value rewrite can act on. The printer asks
// this one question first, and the great majority of attributes on a page — a
// `data-*`, an `id`, an `aria-*`, a `role` — are answered with a single miss
// instead of walking each table in turn.
const REWRITABLE_ATTRIBUTE_NAMES = [
	...new Set([
		...SRCSET_ATTRIBUTES,
		...COMMA_LIST_ATTRIBUTES,
		...urls.map(([name]) => name),
		...integers.map(([name]) => name),
		...tokenLists.map(([name]) => name),
		...ENUMERATED_ATTRIBUTE_NAMES,
		// Handled by name rather than by table: a `style` declaration list, and
		// a `<meta name=viewport>` `content`.
		"style",
		"content"
	])
].sort();

// Derived: an empty token list is no tokens, which is what absence gives —
// except `sandbox`, whose empty list is the most restrictive state there is.
const emptyRemovable = /** @type {[string, string[] | null][]} */ (
	/** @type {ParserTable} */
	(
		/** @type {ParserTable[]} */ (PARSER_TABLES).find(
			([name]) => name === "EMPTY_REMOVABLE_ATTRIBUTES"
		)
	)[3]
);
// Carrying the scope, not just the name: off the elements the list is defined
// for, the same spelling is an author attribute that means whatever a script
// reads back. A hand-reasoned global already covers every element, so it wins.
for (const [name, on] of tokenLists) {
	if (
		name === "sandbox" ||
		emptyRemovable.some(([listed]) => listed === name)
	) {
		continue;
	}
	emptyRemovable.push([name, on]);
}
// Event handlers stay: an empty body still compiles, so the IDL member reads
// back a function where absence reads null.
emptyRemovable.sort((a, b) => (a[0] < b[0] ? -1 : 1));

// Derived: a void element that belongs in the head carries everything it does
// in its attributes, so one with none does nothing at all. `removeEmptyElements`
// may drop these even though the void guard otherwise keeps every void element.
const EMPTY_METADATA_ELEMENTS = /** @type {string[]} */ (
	/** @type {ParserTable} */
	(
		/** @type {ParserTable[]} */ (PARSER_TABLES).find(
			([name]) => name === "HEAD_ELEMENTS"
		)
	)[3]
).filter((name) =>
	/** @type {string[]} */ (
		/** @type {ParserTable} */
		(
			/** @type {ParserTable[]} */ (PARSER_TABLES).find(
				([name2]) => name2 === "VOID"
			)
		)[3]
	).includes(name)
);

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

/**
 * @param {string} key a property name
 * @returns {string} it as written in an object literal
 */
const propertyKey = (key) => (/^[A-Za-z]\w*$/.test(key) ? key : `"${key}"`);

/**
 * Regroup `element attribute` -> value entries under the element name, so the
 * reader gates on one lookup instead of building a key per attribute it sees.
 * @param {[string, string][]} entries the flat entries
 * @param {boolean=} asSet whether each value is a space-separated keyword set
 * @returns {string} the nested object literal
 */
const byElementLiteral = (entries, asSet = false) => {
	/** @type {Map<string, [string, string][]>} */
	const grouped = new Map();
	for (const [key, mapped] of entries) {
		const space = key.indexOf(" ");
		const element = key.slice(0, space);
		const existing = grouped.get(element);
		const attribute = /** @type {[string, string]} */ ([
			key.slice(space + 1),
			mapped
		]);
		if (existing === undefined) grouped.set(element, [attribute]);
		else existing.push(attribute);
	}
	const inner = [...grouped]
		.map(
			([element, attributes]) =>
				`${propertyKey(
					element
				)}: Object.assign(Object.create(null), {${attributes
					.map(
						([attribute, mapped]) =>
							`${propertyKey(attribute)}: ${
								asSet ? setLiteral(mapped.split(" ")) : `"${mapped}"`
							}`
					)
					.join(", ")}})`
		)
		.join(", ");
	return `Object.assign(Object.create(null), {${inner}})`;
};

/**
 * One `PARSER_TABLES` entry as its documented declaration. Name maps get a null
 * prototype, so a tag called `constructor` is a miss rather than a hit.
 * @param {ParserTable} table the entry
 * @returns {string} the declaration
 */
const parserTable = ([name, kind, doc, items]) => {
	const value =
		kind === "set"
			? setLiteral(/** @type {string[]} */ (items))
			: kind === "map"
				? mapLiteral(/** @type {[string, string[] | null][]} */ (items))
				: kind === "byElement" || kind === "byElementSet"
					? byElementLiteral(
							/** @type {[string, string][]} */ (items),
							kind === "byElementSet"
						)
					: kind === "array"
						? `[${items.map((item) => `"${item}"`).join(", ")}]`
						: `Object.assign(Object.create(null), {${
								/** @type {[string, string][]} */ (items)
									.map(([key, mapped]) => `${propertyKey(key)}: "${mapped}"`)
									.join(", ")
							}})`;
	const type =
		kind === "set"
			? "Set<string>"
			: kind === "map"
				? "Map<string, Set<string> | null>"
				: kind === "byElement"
					? "Record<string, Record<string, string>>"
					: kind === "byElementSet"
						? "Record<string, Record<string, Set<string>>>"
						: kind === "array"
							? "string[]"
							: "Record<string, string>";
	// The `charset` value is an attribute spelling, not a Node encoding id.
	const encoded = value.includes('"utf-8"');
	const open = encoded
		? "/* eslint-disable unicorn/text-encoding-identifier-case */\n"
		: "";
	const close = encoded
		? "/* eslint-enable unicorn/text-encoding-identifier-case */\n"
		: "";
	return `/**\n * ${doc}\n * @type {${type}}\n */\n${open}const ${name} = ${value};\n${close}`;
};

// The §13.1.2.4 optional-tag conditions and the value grammars below are prose
// in every source — no dataset states "a `<p>` end tag may be omitted in front
// of these" or "this attribute's value is a srcset" — so they stay written out.
// The element and attribute names cspell does not know. Written twice on
// purpose: the directive covers this file, the string is forwarded into the
// generated one so it passes `lint:spellcheck` too.
// cspell:ignore advasoft altglyph altglyphdef altglyphitem animatecolor animatemotion animatetransform arcrole aswedit attributename attributetype basefrequency baseprofile bgsound calcmode clippathunits contenteditable diffuseconstant enterkeyhint fedropshadow filterunits formenctype formmethod formtarget glyphref gradienttransform gradientunits hotjava hotmetal inputmode jscript kernelmatrix kernelunitlength keypoints keysplines keytimes limitingconeangle livescript markerheight markerwidth maskcontentunits maskunits metrius mtext numoctaves pathlength patterncontentunits patterntransform patternunits pointsatx pointsaty pointsatz preservealpha primitiveunits refx refy repeatcount repeatdur requiredextensions requiredfeatures silmaril softquad specularconstant specularexponent startoffset stddeviation stitchtiles surfacescale systemlanguage tablevalues targetx targety textlength viewbox viewtarget webtechs writingsuggestions xchannelselector ychannelselector
const CSPELL_IGNORE =
	"advasoft altglyph altglyphdef altglyphitem animatecolor animatemotion animatetransform arcrole aswedit attributename attributetype basefrequency baseprofile bgsound calcmode clippathunits contenteditable diffuseconstant enterkeyhint fedropshadow filterunits formenctype formmethod formtarget glyphref gradienttransform gradientunits hotjava hotmetal inputmode jscript kernelmatrix kernelunitlength keypoints keysplines keytimes limitingconeangle livescript markerheight markerwidth maskcontentunits maskunits metrius mtext numoctaves pathlength patterncontentunits patterntransform patternunits pointsatx pointsaty pointsatz preservealpha primitiveunits refx refy repeatcount repeatdur requiredextensions requiredfeatures silmaril softquad specularconstant specularexponent startoffset stddeviation stitchtiles surfacescale systemlanguage tablevalues targetx targety textlength viewbox viewtarget webtechs writingsuggestions xchannelselector ychannelselector";

const EXPORT_NAMES = [
	"BOOLEAN_ATTRIBUTES",
	"COMMA_LIST_ATTRIBUTES",
	"DOM_TOKEN_LIST_ATTRIBUTES",
	"INTEGER_ATTRIBUTES",
	"BODY_START_KEPT_BEFORE",
	"EMPTY_METADATA_ELEMENTS",
	"ENUMERATED_ATTRIBUTE_NAMES",
	"REWRITABLE_ATTRIBUTES",
	"OPTIONAL_END_TAG_AT_END",
	"OPTIONAL_END_TAG_FOLLOWERS",
	"OPTIONAL_END_TAG_UNLESS_TRAILING_NODE",
	"P_FOLLOWED_BY",
	"P_ENDS_ON_PARENT_END_TAG",
	"SIGNED_INTEGER_ATTRIBUTES",
	"SRCSET_ATTRIBUTES",
	"TOKEN_LIST_ATTRIBUTES",
	"URL_ATTRIBUTES",
	...PARSER_TABLES.map(([name]) => name)
].sort();

const source = `/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// GENERATED by tooling/generate-html-data.js — do not edit.
// cspell:ignore ${CSPELL_IGNORE}
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
		`["${name}", ${
			followers === "p" ? "P_FOLLOWED_BY" : setLiteral(followers)
		}]`
).join(", ")}]);

/**
 * §13.1.2.4: the elements whose end tag may be omitted unless ASCII whitespace
 * or a comment follows. A different condition from the follower-set rule above:
 * what closes these is the insertion mode, whatever the next element is, so only
 * a node that would move inside them keeps the tag.
 * @type {Set<string>}
 */
const OPTIONAL_END_TAG_UNLESS_TRAILING_NODE = ${setLiteral(
	OPTIONAL_END_TAG_UNLESS_TRAILING_NODE
)};

/**
 * The subset of \`OPTIONAL_END_TAG_FOLLOWERS\` that may also drop the end tag with
 * nothing left in the parent. \`<dt>\` and \`<thead>\` are absent: the spec gives
 * them no such clause.
 * @type {Set<string>}
 */
const OPTIONAL_END_TAG_AT_END = ${setLiteral(OPTIONAL_END_TAG_AT_END)};

/**
 * Every attribute name a value rewrite can act on. One miss here rules an
 * attribute out of the whole chain, which is what most of them are.
 * @type {Set<string>}
 */
const REWRITABLE_ATTRIBUTES = ${setLiteral(REWRITABLE_ATTRIBUTE_NAMES)};

/**
 * Every name \`ENUMERATED_KEYWORDS\` scopes, whatever the element. One miss here
 * rules an attribute out, which is what keeps the enumerated fold off the cost
 * of every attribute that enumerates nothing.
 * @type {Set<string>}
 */
const ENUMERATED_ATTRIBUTE_NAMES = ${setLiteral(ENUMERATED_ATTRIBUTE_NAMES)};

/**
 * A void element that belongs in the head: with no attributes it states nothing,
 * so \`removeEmptyElements\` may drop it even though every other void element is
 * kept. Derived as the head elements that are also void.
 * @type {Set<string>}
 */
const EMPTY_METADATA_ELEMENTS = ${setLiteral(EMPTY_METADATA_ELEMENTS)};

/**
 * §13.1.2.4: the elements that keep a \`<body>\` start tag when the body opens
 * with one — the parser reads them as head content and would move them out of
 * the body once the tag goes.
 * @type {Set<string>}
 */
const BODY_START_KEPT_BEFORE = ${setLiteral(BODY_START_KEPT_BEFORE)};

/**
 * Parents whose own end tag generates implied end tags, so a trailing \`</p>\`
 * inside one is closed by it and can be left out (§13.2.6.4.7). Listed rather
 * than excluded: an end tag not named here is "any other end tag", which a
 * special element on the stack makes the parser ignore — so anything unknown,
 * a custom element included, keeps its \`</p>\`.
 * @type {Set<string>}
 */
const P_ENDS_ON_PARENT_END_TAG = ${setLiteral(P_ENDS_ON_PARENT_END_TAG)};

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
 * The token lists reflected as a \`DOMTokenList\`, which is an ordered *set* — a
 * repeated token was never a second token, so dropping it changes nothing the
 * DOM reads. The rest are read back as written, and \`ping\` sends one request
 * per token, so a repeat there is not the printer's to drop.
 * @type {Set<string>}
 */
const DOM_TOKEN_LIST_ATTRIBUTES = ${setLiteral(domTokenLists)};

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

${PARSER_TABLES.map(parserTable).join("\n")}
${EXPORT_NAMES.map((name) => `module.exports.${name} = ${name};`).join("\n")}
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
