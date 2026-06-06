/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Raj Aryan (based on SWC parser by Alexander Akait)
*/

"use strict";

// cspell:ignore advasoft altglyph altglyphdef altglyphitem animatecolor animatemotion animatetransform arcrole aswedit attributename attributetype basefrequency baseprofile bgsound calcmode clippathunits definitionurl diffuseconstant fedropshadow filterunits glyphref gradienttransform gradientunits hotjava hotmetal kernelmatrix kernelunitlength keypoints keysplines keytimes limitingconeangle malignmark markerheight markerwidth maskcontentunits maskunits metrius mglyph mtext numoctaves pathlength patterncontentunits patterntransform patternunits pointsatx pointsaty pointsatz preservealpha primitiveunits refx refy repeatcount repeatdur requiredextensions requiredfeatures selectedcontent silmaril softquad specularconstant specularexponent startoffset stddeviation stitchtiles surfacescale systemlanguage tablevalues targetx targety textlength viewbox viewtarget webtechs xchannelselector ychannelselector

// WHATWG HTML tree construction (https://html.spec.whatwg.org/multipage/parsing.html#tree-construction)
// on top of walkHtmlTokens. Scripting is always disabled (webpack is a build tool).

const walkHtmlTokens = require("./walkHtmlTokens");

// Namespaces (mirrors swc_html_ast::Namespace)
const NS_HTML = 0;
const NS_MATHML = 1;
const NS_SVG = 2;

/**
 * @typedef {object} HtmlAttribute
 * @property {string} name lowercased (and, in foreign content, adjusted) attribute name
 * @property {string} value
 * @property {string=} serializedName name used by the html5lib tree serializer (foreign-namespaced)
 * @property {number} nameStart source offset, or -1 on adoption-agency clones
 * @property {number} nameEnd
 * @property {number} valueStart source offset, or -1 when valueless / on clones
 * @property {number} valueEnd
 */

/**
 * @typedef {object} HtmlElement
 * @property {"element"} type
 * @property {string} tagName
 * @property {number} namespace
 * @property {HtmlAttribute[]} attributes
 * @property {HtmlNode[]} children
 * @property {boolean} selfClosing
 * @property {number} start
 * @property {number} end
 * @property {number} tagEnd end offset of the opening tag (after `>`)
 * @property {number} nameEnd end offset of the tag name
 * @property {HtmlDocumentFragment=} templateContent `<template>` content fragment
 */

/**
 * @typedef {object} HtmlText
 * @property {"text"} type
 * @property {string} data
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlComment
 * @property {"comment"} type
 * @property {string} data
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlDoctype
 * @property {"doctype"} type
 * @property {string} name
 * @property {string | null} publicId
 * @property {string | null} systemId
 * @property {number} start
 * @property {number} end
 */

/**
 * @typedef {object} HtmlDocument
 * @property {"document"} type
 * @property {HtmlNode[]} children
 */

/**
 * @typedef {object} HtmlDocumentFragment
 * @property {"document-fragment"} type
 * @property {HtmlNode[]} children
 */

/** @typedef {HtmlElement | HtmlText | HtmlComment | HtmlDoctype} HtmlNode */

/** @typedef {{ start: number, end: number, tagEnd: number, nameEnd: number }} TagPos */

/** @typedef {{ type: "char", data: string, start: number, end: number }} CharToken */
/** @typedef {{ type: "comment", data: string, start: number, end: number }} CommentToken */
/** @typedef {{ type: "doctype", name: string, publicId: (string | null), systemId: (string | null), start: number, end: number }} DoctypeToken */
/** @typedef {{ type: "startTag", name: string, attrs: HtmlAttribute[], selfClosing: boolean, pos: TagPos, swallowNewline?: boolean }} StartTagToken */
/** @typedef {{ type: "endTag", name: string, pos: TagPos }} EndTagToken */
/** @typedef {{ type: "eof" }} EofToken */

/**
 * Internal token passed through the tree-construction insertion modes.
 * @typedef {CharToken | CommentToken | DoctypeToken | StartTagToken | EndTagToken | EofToken} Token
 */

/** @typedef {{ parent: HtmlElement | HtmlDocument | HtmlDocumentFragment, beforeNode: (HtmlNode | null) }} InsertionPlace */

const VOID = new Set([
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
]);

const SPECIAL = new Set([
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
]);
// MathML/SVG specials handled via namespace checks below.

const FORMATTING = new Set([
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
]);

const HEADING = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

const isSpecial = (/** @type {HtmlElement} */ el) => {
	if (el.namespace === NS_HTML) return SPECIAL.has(el.tagName);
	if (el.namespace === NS_MATHML) {
		return ["mi", "mo", "mn", "ms", "mtext", "annotation-xml"].includes(
			el.tagName
		);
	}
	if (el.namespace === NS_SVG) {
		return ["foreignobject", "desc", "title"].includes(
			el.tagName.toLowerCase()
		);
	}
	return false;
};

// SVG tag name case adjustments
const SVG_TAG_ADJUST = {
	altglyph: "altGlyph",
	altglyphdef: "altGlyphDef",
	altglyphitem: "altGlyphItem",
	animatecolor: "animateColor",
	animatemotion: "animateMotion",
	animatetransform: "animateTransform",
	clippath: "clipPath",
	feblend: "feBlend",
	fecolormatrix: "feColorMatrix",
	fecomponenttransfer: "feComponentTransfer",
	fecomposite: "feComposite",
	feconvolvematrix: "feConvolveMatrix",
	fediffuselighting: "feDiffuseLighting",
	fedisplacementmap: "feDisplacementMap",
	fedistantlight: "feDistantLight",
	fedropshadow: "feDropShadow",
	feflood: "feFlood",
	fefunca: "feFuncA",
	fefuncb: "feFuncB",
	fefuncg: "feFuncG",
	fefuncr: "feFuncR",
	fegaussianblur: "feGaussianBlur",
	feimage: "feImage",
	femerge: "feMerge",
	femergenode: "feMergeNode",
	femorphology: "feMorphology",
	feoffset: "feOffset",
	fepointlight: "fePointLight",
	fespecularlighting: "feSpecularLighting",
	fespotlight: "feSpotLight",
	fetile: "feTile",
	feturbulence: "feTurbulence",
	foreignobject: "foreignObject",
	glyphref: "glyphRef",
	lineargradient: "linearGradient",
	radialgradient: "radialGradient",
	textpath: "textPath"
};

// SVG attribute case adjustments (lowercase -> camelCase). Subset commonly tested.
const SVG_ATTR_ADJUST = {
	attributename: "attributeName",
	attributetype: "attributeType",
	basefrequency: "baseFrequency",
	baseprofile: "baseProfile",
	calcmode: "calcMode",
	clippathunits: "clipPathUnits",
	diffuseconstant: "diffuseConstant",
	edgemode: "edgeMode",
	filterunits: "filterUnits",
	glyphref: "glyphRef",
	gradienttransform: "gradientTransform",
	gradientunits: "gradientUnits",
	kernelmatrix: "kernelMatrix",
	kernelunitlength: "kernelUnitLength",
	keypoints: "keyPoints",
	keysplines: "keySplines",
	keytimes: "keyTimes",
	lengthadjust: "lengthAdjust",
	limitingconeangle: "limitingConeAngle",
	markerheight: "markerHeight",
	markerunits: "markerUnits",
	markerwidth: "markerWidth",
	maskcontentunits: "maskContentUnits",
	maskunits: "maskUnits",
	numoctaves: "numOctaves",
	pathlength: "pathLength",
	patterncontentunits: "patternContentUnits",
	patterntransform: "patternTransform",
	patternunits: "patternUnits",
	pointsatx: "pointsAtX",
	pointsaty: "pointsAtY",
	pointsatz: "pointsAtZ",
	preservealpha: "preserveAlpha",
	preserveaspectratio: "preserveAspectRatio",
	primitiveunits: "primitiveUnits",
	refx: "refX",
	refy: "refY",
	repeatcount: "repeatCount",
	repeatdur: "repeatDur",
	requiredextensions: "requiredExtensions",
	requiredfeatures: "requiredFeatures",
	specularconstant: "specularConstant",
	specularexponent: "specularExponent",
	spreadmethod: "spreadMethod",
	startoffset: "startOffset",
	stddeviation: "stdDeviation",
	stitchtiles: "stitchTiles",
	surfacescale: "surfaceScale",
	systemlanguage: "systemLanguage",
	tablevalues: "tableValues",
	targetx: "targetX",
	targety: "targetY",
	textlength: "textLength",
	viewbox: "viewBox",
	viewtarget: "viewTarget",
	xchannelselector: "xChannelSelector",
	ychannelselector: "yChannelSelector",
	zoomandpan: "zoomAndPan"
};

// Foreign attributes that get a prefix in the serialization (namespaced).
const FOREIGN_ATTR_NS = {
	"xlink:actuate": "xlink actuate",
	"xlink:arcrole": "xlink arcrole",
	"xlink:href": "xlink href",
	"xlink:role": "xlink role",
	"xlink:show": "xlink show",
	"xlink:title": "xlink title",
	"xlink:type": "xlink type",
	"xml:lang": "xml lang",
	"xml:space": "xml space",
	xmlns: "xmlns",
	"xmlns:xlink": "xmlns xlink"
};

const MATHML_TEXT_INTEGRATION = new Set(["mi", "mo", "mn", "ms", "mtext"]);

/**
 * @param {string} source HTML source
 * @param {string=} fragmentContext context element name for fragment parsing (e.g. `td`, `svg path`); omit for a full document
 * @returns {HtmlDocument} document AST
 */
const buildHtmlAst = (source, fragmentContext) => {
	/** @type {HtmlDocument} */
	const doc = { type: "document", children: [] };
	let mode = "initial";
	/** @type {string | null} */
	let originalMode = null;
	/** @type {HtmlElement[]} stack of open elements (bottom .. top) */
	const open = [];
	/** @type {{ element?: HtmlElement, marker?: boolean }[]} active formatting elements */
	const afe = [];
	const afeEl = (/** @type {{ element?: HtmlElement }} */ e) =>
		/** @type {HtmlElement} */ (e.element);
	/** @type {HtmlElement | null} */
	let head = null;
	/** @type {HtmlElement | null} */
	let form = null;
	let framesetOk = true;
	/** @type {HtmlAttribute[]} */
	let pendingAttrs = [];
	let fosterParenting = false;
	/** @type {string[]} */
	const templateModes = [];
	let quirks = false;
	const scriptingFlag = false;
	/** @type {HtmlElement | null} */
	let fragment = null;
	// End offset of the token currently being processed (for element `.end`).
	let tokenEnd = 0;

	const cur = () => /** @type {HtmlElement} */ (open[open.length - 1]);
	const adjustedCurrent = () => {
		if (open.length === 1 && fragment) return fragment;
		return cur();
	};

	const mkEl = (
		/** @type {string} */ tagName,
		/** @type {number} */ ns,
		/** @type {HtmlAttribute[] | undefined} */ attributes,
		/** @type {TagPos | null | undefined} */ pos
	) =>
		/** @type {HtmlElement} */ ({
			type: "element",
			tagName,
			namespace: ns,
			attributes: attributes || [],
			children: [],
			selfClosing: ns === NS_HTML && VOID.has(tagName),
			start: pos ? pos.start : 0,
			end: pos ? pos.end : 0,
			tagEnd: pos ? pos.tagEnd : 0,
			nameEnd: pos ? pos.nameEnd : 0
		});

	// Clone of a formatting element's attributes: keep name/value (and the
	// serializer name) but drop source offsets so the consumer doesn't emit a
	// duplicate dependency for the reopened element's spans.
	const cloneAttrs = (/** @type {HtmlAttribute[]} */ attributes) =>
		attributes.map((a) => ({
			name: a.name,
			value: a.value,
			serializedName: a.serializedName,
			nameStart: -1,
			nameEnd: -1,
			valueStart: -1,
			valueEnd: -1
		}));

	/**
	 * @param {HtmlElement | HtmlDocument | HtmlDocumentFragment} parent container
	 * @returns {HtmlNode[]} children array to insert into
	 */
	const childrenOf = (parent) =>
		parent.type === "element" && parent.templateContent
			? parent.templateContent.children
			: parent.children;

	const appendTo = (
		/** @type {HtmlElement | HtmlDocument | HtmlDocumentFragment} */ parent,
		/** @type {HtmlNode} */ node
	) => {
		const arr = childrenOf(parent);
		const last = arr[arr.length - 1];
		if (node.type === "text" && last && last.type === "text") {
			last.data += node.data;
			if (node.end !== undefined) last.end = node.end;
			return;
		}
		arr.push(node);
	};

	// "appropriate place for inserting a node"
	const appropriatePlace = () => {
		const target = cur();
		if (
			fosterParenting &&
			["table", "tbody", "tfoot", "thead", "tr"].includes(target.tagName) &&
			target.namespace === NS_HTML
		) {
			// find last template / last table
			let lastTemplate = -1;
			let lastTable = -1;
			for (let i = open.length - 1; i >= 0; i--) {
				if (
					open[i].tagName === "template" &&
					open[i].namespace === NS_HTML &&
					lastTemplate === -1
				) {
					lastTemplate = i;
				}
				if (
					open[i].tagName === "table" &&
					open[i].namespace === NS_HTML &&
					lastTable === -1
				) {
					lastTable = i;
				}
			}
			if (
				lastTemplate !== -1 &&
				(lastTable === -1 || lastTemplate > lastTable)
			) {
				return { parent: open[lastTemplate], beforeNode: null };
			}
			if (lastTable === -1) {
				return { parent: open[0], beforeNode: null };
			}
			const table = open[lastTable];
			// find table's parent in tree
			const tp = findParent(table);
			if (tp) return { parent: tp, beforeNode: table };
			return { parent: open[lastTable - 1], beforeNode: null };
		}
		return { parent: target, beforeNode: null };
	};

	const findParent = (/** @type {HtmlNode} */ node) => {
		// search the whole document tree for the parent of node
		/** @type {(HtmlElement | HtmlDocument | HtmlDocumentFragment)[]} */
		const stack = [doc];
		while (stack.length) {
			const x =
				/** @type {HtmlElement | HtmlDocument | HtmlDocumentFragment} */ (
					stack.pop()
				);
			for (const k of childrenOf(x)) {
				if (k === node) return x;
				if (k.type === "element") stack.push(k);
			}
		}
		return null;
	};

	const insertAtPlace = (
		/** @type {InsertionPlace} */ place,
		/** @type {HtmlNode} */ node
	) => {
		if (place.beforeNode) {
			const arr = childrenOf(place.parent);
			const idx = arr.indexOf(place.beforeNode);
			if (node.type === "text" && idx > 0 && arr[idx - 1].type === "text") {
				/** @type {HtmlText} */ (arr[idx - 1]).data += node.data;
				return;
			}
			arr.splice(idx, 0, node);
		} else {
			appendTo(place.parent, node);
		}
	};

	const insertCharacters = (
		/** @type {string} */ data,
		/** @type {number} */ start,
		/** @type {number} */ end
	) => {
		const place = appropriatePlace();
		if (place.parent.type === "document") return; // never insert text into document
		insertAtPlace(place, { type: "text", data, start, end });
	};

	/**
	 * @param {string} data comment data
	 * @param {number} start start offset
	 * @param {number} end end offset
	 * @param {InsertionPlace=} place explicit insertion place
	 */
	const insertComment = (data, start, end, place) => {
		const p = place || appropriatePlace();
		insertAtPlace(p, { type: "comment", data, start, end });
	};

	const insertHtmlElement = (
		/** @type {string} */ tagName,
		/** @type {HtmlAttribute[]} */ attributes,
		/** @type {TagPos | null} */ pos
	) => {
		const el = mkEl(tagName, NS_HTML, attributes, pos);
		const place = appropriatePlace();
		insertAtPlace(place, el);
		open.push(el);
		return el;
	};

	const insertForeignElement = (
		/** @type {string} */ tagName,
		/** @type {number} */ ns,
		/** @type {HtmlAttribute[]} */ attributes,
		/** @type {TagPos | null} */ pos
	) => {
		const el = mkEl(tagName, ns, attributes, pos);
		const place = appropriatePlace();
		insertAtPlace(place, el);
		open.push(el);
		return el;
	};

	// ---- scopes ----
	const isScopeBoundary = (/** @type {HtmlElement} */ el) => {
		if (el.namespace === NS_HTML) {
			return [
				"applet",
				"caption",
				"html",
				"table",
				"td",
				"th",
				"marquee",
				"object",
				"template"
			].includes(el.tagName);
		}
		if (el.namespace === NS_MATHML) {
			return ["mi", "mo", "mn", "ms", "mtext", "annotation-xml"].includes(
				el.tagName
			);
		}
		if (el.namespace === NS_SVG) {
			return ["foreignobject", "desc", "title"].includes(
				el.tagName.toLowerCase()
			);
		}
		return false;
	};
	const hasElementInScopeMatching = (
		/** @type {(el: HtmlElement) => boolean} */ test,
		/** @type {(el: HtmlElement) => boolean} */ extra
	) => {
		for (let i = open.length - 1; i >= 0; i--) {
			const el = open[i];
			if (test(el)) return true;
			if (extra(el)) return false;
		}
		return false;
	};
	const inScope = (/** @type {string} */ tagName) =>
		hasElementInScopeMatching(
			(el) => el.namespace === NS_HTML && el.tagName === tagName,
			(el) => isScopeBoundary(el)
		);
	const inScopeEl = (/** @type {HtmlElement} */ target) =>
		hasElementInScopeMatching(
			(el) => el === target,
			(el) => isScopeBoundary(el)
		);
	const inButtonScope = (/** @type {string} */ tagName) =>
		hasElementInScopeMatching(
			(el) => el.namespace === NS_HTML && el.tagName === tagName,
			(el) =>
				isScopeBoundary(el) ||
				(el.namespace === NS_HTML && el.tagName === "button")
		);
	const inListItemScope = (/** @type {string} */ tagName) =>
		hasElementInScopeMatching(
			(el) => el.namespace === NS_HTML && el.tagName === tagName,
			(el) =>
				isScopeBoundary(el) ||
				(el.namespace === NS_HTML &&
					(el.tagName === "ol" || el.tagName === "ul"))
		);
	const inTableScope = (/** @type {string[]} */ tagNames) =>
		hasElementInScopeMatching(
			(el) => el.namespace === NS_HTML && tagNames.includes(el.tagName),
			(el) =>
				el.namespace === NS_HTML &&
				["html", "table", "template"].includes(el.tagName)
		);
	const IMPLIED = new Set([
		"dd",
		"dt",
		"li",
		"optgroup",
		"option",
		"p",
		"rb",
		"rp",
		"rt",
		"rtc"
	]);
	const generateImpliedEndTags = (except = "") => {
		while (open.length) {
			const el = cur();
			if (
				el.namespace === NS_HTML &&
				IMPLIED.has(el.tagName) &&
				el.tagName !== except
			) {
				open.pop();
			} else {
				break;
			}
		}
	};
	const generateImpliedEndTagsThorough = () => {
		const set = new Set([
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
		]);
		while (open.length) {
			const el = cur();
			if (el.namespace === NS_HTML && set.has(el.tagName)) open.pop();
			else break;
		}
	};

	// ---- active formatting elements ----
	const pushAfe = (/** @type {HtmlElement} */ el) => {
		let count = 0;
		for (let i = afe.length - 1; i >= 0; i--) {
			const e = afe[i];
			if (e.marker) break;
			if (
				afeEl(e).tagName === el.tagName &&
				afeEl(e).namespace === el.namespace &&
				sameAttrs(afeEl(e), el)
			) {
				count++;
				if (count === 3) {
					afe.splice(i, 1);
					break;
				}
			}
		}
		afe.push({ element: el });
	};
	const sameAttrs = (
		/** @type {HtmlElement} */ a,
		/** @type {HtmlElement} */ b
	) => {
		if (a.attributes.length !== b.attributes.length) return false;
		const ma = new Map(a.attributes.map((x) => [x.name, x.value]));
		for (const x of b.attributes) if (ma.get(x.name) !== x.value) return false;
		return true;
	};
	const insertMarker = () => afe.push({ marker: true });
	const clearAfeToMarker = () => {
		while (afe.length) {
			const e = /** @type {{ marker?: boolean }} */ (afe.pop());
			if (e.marker) break;
		}
	};
	const reconstructAfe = () => {
		if (afe.length === 0) return;
		let i = afe.length - 1;
		if (afe[i].marker || open.includes(afeEl(afe[i]))) return;
		while (i > 0) {
			i--;
			if (afe[i].marker || open.includes(afeEl(afe[i]))) {
				i++;
				break;
			}
		}
		for (; i < afe.length; i++) {
			const e = afe[i];
			const el = mkEl(
				afeEl(e).tagName,
				afeEl(e).namespace,
				cloneAttrs(afeEl(e).attributes),
				null
			);
			const place = appropriatePlace();
			insertAtPlace(place, el);
			open.push(el);
			afe[i] = { element: el };
		}
	};

	// ---- close p ----
	const closePElement = () => {
		generateImpliedEndTags("p");
		// pop until a p has been popped
		while (open.length) {
			const el = /** @type {HtmlElement} */ (open.pop());
			el.end = tokenEnd;
			if (el.namespace === NS_HTML && el.tagName === "p") break;
		}
	};

	const popUntil = (/** @type {string} */ tagName) => {
		while (open.length) {
			const el = /** @type {HtmlElement} */ (open.pop());
			el.end = tokenEnd;
			if (el.namespace === NS_HTML && el.tagName === tagName) break;
		}
	};
	const popUntilOneOf = (/** @type {Set<string>} */ set) => {
		while (open.length) {
			const el = /** @type {HtmlElement} */ (open.pop());
			el.end = tokenEnd;
			if (el.namespace === NS_HTML && set.has(el.tagName)) break;
		}
	};

	// ---- reset insertion mode appropriately ----
	const resetInsertionMode = () => {
		let last = false;
		for (let i = open.length - 1; i >= 0; i--) {
			let node = open[i];
			if (i === 0) {
				last = true;
				if (fragment) node = fragment;
			}
			const tn = node.tagName;
			if (node.namespace === NS_HTML) {
				if ((tn === "td" || tn === "th") && !last) {
					mode = "inCell";
					return;
				}
				if (tn === "tr") {
					mode = "inRow";
					return;
				}
				if (["tbody", "thead", "tfoot"].includes(tn)) {
					mode = "inTableBody";
					return;
				}
				if (tn === "caption") {
					mode = "inCaption";
					return;
				}
				if (tn === "colgroup") {
					mode = "inColumnGroup";
					return;
				}
				if (tn === "table") {
					mode = "inTable";
					return;
				}
				if (tn === "template") {
					mode = templateModes[templateModes.length - 1];
					return;
				}
				if (tn === "head" && !last) {
					mode = "inHead";
					return;
				}
				if (tn === "body") {
					mode = "inBody";
					return;
				}
				if (tn === "frameset") {
					mode = "inFrameset";
					return;
				}
				if (tn === "html") {
					mode = head ? "afterHead" : "beforeHead";
					return;
				}
			}
			if (last) {
				mode = "inBody";
				return;
			}
		}
	};

	// ---------- token processing ----------
	// Split a character token's leading whitespace; per the spec each character
	// is its own token, so a mixed run can straddle a mode change. Inserts the
	// leading whitespace when `insert`, returns the non-whitespace remainder
	// token (or null when the token was entirely whitespace).
	const leadingWs = (
		/** @type {CharToken} */ t,
		/** @type {boolean} */ insert
	) => {
		const m = /^[\t\n\f\r ]+/.exec(t.data);
		const ws = m ? m[0] : "";
		if (ws && insert) insertCharacters(ws, t.start, t.start + ws.length);
		if (ws.length === t.data.length) return null;
		return { ...t, data: t.data.slice(ws.length), start: t.start + ws.length };
	};

	const WS = new Set([" ", "\t", "\n", "\f", "\r"]);
	const isAllWs = (/** @type {string} */ s) => {
		for (const c of s) if (!WS.has(c)) return false;
		return true;
	};

	const process = (/** @type {Token} */ t) => {
		// Track the current token's end so explicit closes can set element `.end`.
		if ("end" in t) tokenEnd = t.end;
		else if ("pos" in t) tokenEnd = t.pos.end;
		// foreign content dispatch
		const ac = adjustedCurrent();
		const useForeign =
			open.length > 0 &&
			ac &&
			ac.namespace !== NS_HTML &&
			!(t.type === "eof") &&
			shouldUseForeignRules(ac, t);
		if (useForeign) {
			foreignContent(t);
			return;
		}
		modes[mode](t);
	};

	const shouldUseForeignRules = (
		/** @type {HtmlElement} */ ac,
		/** @type {Token} */ t
	) => {
		if (ac.namespace === NS_HTML) return false;
		if (t.type === "startTag") {
			if (
				mathmlTextIntegrationPoint(ac) &&
				t.name !== "mglyph" &&
				t.name !== "malignmark"
			) {
				return false;
			}
			if (
				ac.namespace === NS_MATHML &&
				ac.tagName === "annotation-xml" &&
				t.name === "svg"
			) {
				return false;
			}
			if (htmlIntegrationPoint(ac)) return false;
			return true;
		}
		if (t.type === "char") {
			if (mathmlTextIntegrationPoint(ac)) return false;
			if (htmlIntegrationPoint(ac)) return false;
			return true;
		}
		if (t.type === "endTag") return true;
		if (t.type === "comment") return true;
		return false;
	};

	const mathmlTextIntegrationPoint = (/** @type {HtmlElement} */ el) =>
		el.namespace === NS_MATHML && MATHML_TEXT_INTEGRATION.has(el.tagName);
	const htmlIntegrationPoint = (/** @type {HtmlElement} */ el) => {
		if (el.namespace === NS_MATHML && el.tagName === "annotation-xml") {
			const enc = el.attributes.find((a) => a.name === "encoding");
			if (
				enc &&
				(enc.value.toLowerCase() === "text/html" ||
					enc.value.toLowerCase() === "application/xhtml+xml")
			) {
				return true;
			}
			return false;
		}
		if (
			el.namespace === NS_SVG &&
			["foreignobject", "desc", "title"].includes(el.tagName.toLowerCase())
		) {
			return true;
		}
		return false;
	};

	const adjustSvgTag = (/** @type {string} */ name) =>
		/** @type {Record<string, string>} */ (SVG_TAG_ADJUST)[name] || name;
	const adjustForeignAttrs = (
		/** @type {HtmlAttribute[]} */ attrs,
		/** @type {number} */ ns
	) =>
		attrs.map((a) => {
			let name = a.name;
			let serializedName = name;
			if (
				ns === NS_SVG &&
				/** @type {Record<string, string>} */ (SVG_ATTR_ADJUST)[name]
			) {
				name = /** @type {Record<string, string>} */ (SVG_ATTR_ADJUST)[name];
				serializedName = name;
			}
			if (/** @type {Record<string, string>} */ (FOREIGN_ATTR_NS)[a.name]) {
				serializedName = /** @type {Record<string, string>} */ (
					FOREIGN_ATTR_NS
				)[a.name];
			}
			return { ...a, name, serializedName };
		});

	const foreignContent = (/** @type {Token} */ t) => {
		if (t.type === "char") {
			const data = t.data.replace(/\0/g, "�");
			insertCharacters(data, t.start, t.end);
			// eslint-disable-next-line no-control-regex
			if (/[^\t\n\f\r \u0000]/.test(t.data)) framesetOk = false;
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag") {
			const acn = adjustedCurrent().namespace;
			if (
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
				].includes(t.name) ||
				(t.name === "font" &&
					t.attrs.some((a) => ["color", "face", "size"].includes(a.name)))
			) {
				// parse error; pop until integration point / html / mathml-text-integration
				while (open.length > 1) {
					const c = cur();
					if (
						c.namespace === NS_HTML ||
						mathmlTextIntegrationPoint(c) ||
						htmlIntegrationPoint(c)
					) {
						break;
					}
					open.pop();
				}
				modes[mode](t);
				return;
			}
			const ns = acn;
			let name = t.name;
			let attrs = t.attrs;
			if (ns === NS_SVG) {
				name = adjustSvgTag(name);
			}
			if (ns === NS_MATHML) {
				attrs = adjustMathmlAttrs(attrs);
			}
			attrs = adjustForeignAttrs(attrs, ns);
			insertForeignElement(name, ns, attrs, t.pos);
			if (t.selfClosing) {
				open.pop();
			}
			return;
		}
		if (t.type === "endTag") {
			if (
				t.name === "script" &&
				cur().tagName === "script" &&
				cur().namespace === NS_SVG
			) {
				open.pop();
				return;
			}
			// `</p>` and `</br>` break out: pop foreign elements up to the
			// nearest HTML element or integration point, then process in HTML.
			if (t.name === "p" || t.name === "br") {
				while (
					open.length > 1 &&
					cur().namespace !== NS_HTML &&
					!mathmlTextIntegrationPoint(cur()) &&
					!htmlIntegrationPoint(cur())
				) {
					open.pop();
				}
				modes[mode](t);
				return;
			}
			// any other end tag
			let i = open.length - 1;
			let node = open[i];
			if (node.tagName.toLowerCase() !== t.name) {
				/* parse error */
			}
			while (i >= 0) {
				node = open[i];
				if (i === 0) return;
				if (
					node.namespace !== NS_HTML &&
					node.tagName.toLowerCase() === t.name
				) {
					while (open.length > i) open.pop();
					return;
				}
				i--;
				if (open[i] && open[i].namespace === NS_HTML) {
					modes[mode](t);
					return;
				}
			}
		}
	};

	// ---------- adoption agency algorithm ----------
	const adoptionAgency = (
		/** @type {string} */ subject,
		/** @type {TagPos | null} */ pos
	) => {
		// step 1
		const c = cur();
		if (
			c.namespace === NS_HTML &&
			c.tagName === subject &&
			!afe.some((e) => !e.marker && e.element === c)
		) {
			open.pop();
			return true;
		}
		let outer = 0;
		while (outer < 8) {
			outer++;
			// find formatting element
			let fmtIdx = -1;
			for (let i = afe.length - 1; i >= 0; i--) {
				if (afe[i].marker) break;
				if (
					afeEl(afe[i]).tagName === subject &&
					afeEl(afe[i]).namespace === NS_HTML
				) {
					fmtIdx = i;
					break;
				}
			}
			if (fmtIdx === -1) return false; // act as any other end tag
			const fmt = afeEl(afe[fmtIdx]);
			const openIdx = open.indexOf(fmt);
			if (openIdx === -1) {
				afe.splice(fmtIdx, 1);
				return true;
			}
			if (!inScopeEl(fmt)) return true; // parse error, ignore
			// step: furthest block
			let furthestIdx = -1;
			for (let i = openIdx + 1; i < open.length; i++) {
				if (isSpecial(open[i])) {
					furthestIdx = i;
					break;
				}
			}
			if (furthestIdx === -1) {
				while (open.length > openIdx) open.pop();
				afe.splice(fmtIdx, 1);
				return true;
			}
			const furthest = open[furthestIdx];
			const commonAncestor = open[openIdx - 1];
			let bookmark = fmtIdx;
			let node = furthest;
			let lastNode = furthest;
			let nodeIdx = furthestIdx;
			let inner = 0;
			while (true) {
				inner++;
				nodeIdx--;
				node = open[nodeIdx];
				if (node === fmt) break;
				const nodeRef = node;
				let nodeAfeIdx = afe.findIndex(
					(e) => !e.marker && e.element === nodeRef
				);
				if (inner > 3 && nodeAfeIdx !== -1) {
					afe.splice(nodeAfeIdx, 1);
					if (nodeAfeIdx < bookmark) bookmark--;
					nodeAfeIdx = -1;
				}
				if (nodeAfeIdx === -1) {
					open.splice(nodeIdx, 1);
					continue;
				}
				// create clone
				const clone = mkEl(
					node.tagName,
					node.namespace,
					cloneAttrs(node.attributes),
					null
				);
				afe[nodeAfeIdx] = { element: clone };
				open[nodeIdx] = clone;
				node = clone;
				if (lastNode === furthest) bookmark = nodeAfeIdx + 1;
				// append lastNode to node
				detach(lastNode);
				appendTo(node, lastNode);
				lastNode = node;
			}
			// insert lastNode into common ancestor (with foster parenting)
			detach(lastNode);
			const place = placeForCommonAncestor(commonAncestor);
			insertAtPlace(place, lastNode);
			// create element for fmt token, take children of furthest
			const cloneFmt = mkEl(
				fmt.tagName,
				fmt.namespace,
				cloneAttrs(fmt.attributes),
				null
			);
			const kids = [...furthest.children];
			furthest.children.length = 0;
			for (const k of kids) appendTo(cloneFmt, k);
			appendTo(furthest, cloneFmt);
			// remove fmt from afe, insert clone at bookmark
			const curFmtIdx = afe.findIndex((e) => !e.marker && e.element === fmt);
			if (curFmtIdx !== -1) {
				afe.splice(curFmtIdx, 1);
				if (curFmtIdx < bookmark) bookmark--;
			}
			afe.splice(bookmark, 0, { element: cloneFmt });
			// remove fmt from open, insert clone below furthest
			const ofi = open.indexOf(fmt);
			if (ofi !== -1) open.splice(ofi, 1);
			const newFurthestIdx = open.indexOf(furthest);
			open.splice(newFurthestIdx + 1, 0, cloneFmt);
		}
		return true;
	};

	const placeForCommonAncestor = (
		/** @type {HtmlElement} */ commonAncestor
	) => {
		if (
			["table", "tbody", "tfoot", "thead", "tr"].includes(
				commonAncestor.tagName
			) &&
			commonAncestor.namespace === NS_HTML
		) {
			// foster
			// reuse appropriatePlace logic but rooted differently: emulate
			let lastTemplate = -1;
			let lastTable = -1;
			for (let i = open.length - 1; i >= 0; i--) {
				if (
					open[i].tagName === "template" &&
					open[i].namespace === NS_HTML &&
					lastTemplate === -1
				) {
					lastTemplate = i;
				}
				if (
					open[i].tagName === "table" &&
					open[i].namespace === NS_HTML &&
					lastTable === -1
				) {
					lastTable = i;
				}
			}
			if (
				lastTemplate !== -1 &&
				(lastTable === -1 || lastTemplate > lastTable)
			) {
				return { parent: open[lastTemplate], beforeNode: null };
			}
			if (lastTable === -1) return { parent: open[0], beforeNode: null };
			const table = open[lastTable];
			const tp = findParent(table);
			if (tp) return { parent: tp, beforeNode: table };
			return { parent: open[lastTable - 1], beforeNode: null };
		}
		return { parent: commonAncestor, beforeNode: null };
	};

	const detach = (/** @type {HtmlNode} */ node) => {
		const p = findParent(node);
		if (!p) return;
		const arr = childrenOf(p);
		const idx = arr.indexOf(node);
		if (idx !== -1) arr.splice(idx, 1);
	};

	// ---------- insertion modes ----------

	/** @type {Record<string, (t: Token) => void>} */
	const modes = {};

	const QUIRKY_PREFIXES = [
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
	];
	const QUIRKY_EXACT = new Set([
		"-//w3o//dtd w3 html strict 3.0//en//",
		"-/w3c/dtd html 4.0 transitional/en",
		"html"
	]);
	const isQuirky = (
		/** @type {string} */ name,
		/** @type {string | null} */ pub,
		/** @type {string | null} */ sys
	) => {
		if (name !== "html") return true;
		const p = pub ? pub.toLowerCase() : null;
		const sl = sys ? sys.toLowerCase() : null;
		if (p !== null) {
			if (QUIRKY_EXACT.has(p)) return true;
			for (const pre of QUIRKY_PREFIXES) if (p.startsWith(pre)) return true;
			if (
				sl === null &&
				(p.startsWith("-//w3c//dtd html 4.01 frameset//") ||
					p.startsWith("-//w3c//dtd html 4.01 transitional//"))
			) {
				return true;
			}
		}
		if (sl === "http://www.ibm.com/data/dtd/v11/ibmxhtml1-transitional.dtd") {
			return true;
		}
		return false;
	};

	modes.initial = (t) => {
		if (t.type === "char") {
			const r = leadingWs(t, false);
			if (!r) return;
			quirks = true;
			mode = "beforeHtml";
			process(r);
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end, { parent: doc, beforeNode: null });
			return;
		}
		if (t.type === "doctype") {
			doc.children.push({
				type: "doctype",
				name: t.name,
				publicId: t.publicId,
				systemId: t.systemId,
				start: t.start,
				end: t.end
			});
			quirks = isQuirky(t.name, t.publicId, t.systemId);
			mode = "beforeHtml";
			return;
		}
		quirks = true;
		mode = "beforeHtml";
		process(t);
	};

	modes.beforeHtml = (t) => {
		if (t.type === "doctype") return;
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end, { parent: doc, beforeNode: null });
			return;
		}
		if (t.type === "char") {
			const r = leadingWs(t, false);
			if (!r) return;
			t = r;
		}
		if (t.type === "startTag" && t.name === "html") {
			const el = mkEl("html", NS_HTML, t.attrs, t.pos);
			doc.children.push(el);
			open.push(el);
			mode = "beforeHead";
			return;
		}
		if (
			t.type === "endTag" &&
			!["head", "body", "html", "br"].includes(t.name)
		) {
			return;
		}
		const el = mkEl("html", NS_HTML, [], null);
		doc.children.push(el);
		open.push(el);
		mode = "beforeHead";
		process(t);
	};

	modes.beforeHead = (t) => {
		if (t.type === "char") {
			const r = leadingWs(t, false);
			if (!r) return;
			t = r;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "startTag" && t.name === "head") {
			head = insertHtmlElement("head", t.attrs, t.pos);
			mode = "inHead";
			return;
		}
		if (
			t.type === "endTag" &&
			!["head", "body", "html", "br"].includes(t.name)
		) {
			return;
		}
		head = insertHtmlElement("head", [], null);
		mode = "inHead";
		process(t);
	};

	modes.inHead = (t) => {
		if (t.type === "char") {
			const r = leadingWs(t, true);
			if (!r) return;
			open.pop();
			mode = "afterHead";
			process(r);
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag") {
			if (t.name === "html") return modes.inBody(t);
			if (["base", "basefont", "bgsound", "link", "meta"].includes(t.name)) {
				insertHtmlElement(t.name, t.attrs, t.pos);
				open.pop();
				return;
			}
			if (t.name === "title") {
				genericRcdata(t);
				return;
			}
			if (["noframes", "style", "noscript"].includes(t.name)) {
				if (t.name === "noscript" && !scriptingFlag) {
					insertHtmlElement("noscript", t.attrs, t.pos);
					mode = "inHeadNoscript";
					return;
				}
				genericRawtext(t);
				return;
			}
			if (t.name === "script") {
				genericRawtext(t);
				return;
			}
			if (t.name === "template") {
				insertHtmlElement("template", t.attrs, t.pos);
				insertMarker();
				framesetOk = false;
				mode = "inTemplate";
				templateModes.push("inTemplate");
				const el = cur();
				el.templateContent = { type: "document-fragment", children: [] };
				return;
			}
			if (t.name === "head") return;
		}
		if (t.type === "endTag") {
			if (t.name === "head") {
				open.pop();
				mode = "afterHead";
				return;
			}
			if (["body", "html", "br"].includes(t.name)) {
				/* fallthrough */
			} else if (t.name === "template") {
				if (
					!open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
				) {
					return;
				}
				generateImpliedEndTagsThorough();
				popUntil("template");
				clearAfeToMarker();
				templateModes.pop();
				resetInsertionMode();
				return;
			} else {
				return;
			}
		}
		// anything else
		open.pop();
		mode = "afterHead";
		process(t);
	};

	modes.inHeadNoscript = (t) => {
		if (t.type === "doctype") return;
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "endTag" && t.name === "noscript") {
			open.pop();
			mode = "inHead";
			return;
		}
		if (t.type === "char" && isAllWs(t.data)) return modes.inHead(t);
		if (t.type === "comment") return modes.inHead(t);
		if (
			t.type === "startTag" &&
			["basefont", "bgsound", "link", "meta", "noframes", "style"].includes(
				t.name
			)
		) {
			return modes.inHead(t);
		}
		// A stray end tag other than </br>/</noscript> is ignored (the comment
		// or content stays inside <noscript>); only </br> and other content fall
		// back to popping <noscript>.
		if (t.type === "endTag" && t.name !== "br") return;
		if (t.type === "startTag" && ["head", "noscript"].includes(t.name)) return;
		open.pop();
		mode = "inHead";
		process(t);
	};

	modes.afterHead = (t) => {
		if (t.type === "char") {
			const r = leadingWs(t, true);
			if (!r) return;
			insertHtmlElement("body", [], null);
			mode = "inBody";
			process(r);
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag") {
			if (t.name === "html") return modes.inBody(t);
			if (t.name === "body") {
				insertHtmlElement("body", t.attrs, t.pos);
				framesetOk = false;
				mode = "inBody";
				return;
			}
			if (t.name === "frameset") {
				insertHtmlElement("frameset", t.attrs, t.pos);
				mode = "inFrameset";
				return;
			}
			if (
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
				].includes(t.name)
			) {
				const headEl = /** @type {HtmlElement} */ (head);
				open.push(headEl);
				modes.inHead(t);
				const idx = open.indexOf(headEl);
				if (idx !== -1) open.splice(idx, 1);
				return;
			}
			if (t.name === "head") return;
		}
		if (t.type === "endTag") {
			if (t.name === "template") return modes.inHead(t);
			if (!["body", "html", "br"].includes(t.name)) return;
		}
		insertHtmlElement("body", [], null);
		mode = "inBody";
		process(t);
	};

	modes.inBody = (t) => {
		if (t.type === "char") {
			if (t.data.includes("\0")) t = { ...t, data: t.data.replace(/\0/g, "") };
			if (t.data === "") return;
			reconstructAfe();
			insertCharacters(t.data, t.start, t.end);
			if (!isAllWs(t.data)) framesetOk = false;
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag") return startTagInBody(t);
		if (t.type === "endTag") return endTagInBody(t);
		if (t.type === "eof" && templateModes.length) return modes.inTemplate(t);
	};

	const closeIfPInButtonScope = () => {
		if (inButtonScope("p")) closePElement();
	};

	const startTagInBody = (/** @type {StartTagToken} */ t) => {
		const name = t.name;
		if (name === "html") {
			if (
				open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
			) {
				return;
			}
			const htmlEl = open[0];
			for (const a of t.attrs) {
				if (!htmlEl.attributes.some((x) => x.name === a.name)) {
					htmlEl.attributes.push(a);
				}
			}
			return;
		}
		if (
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
			].includes(name)
		) {
			return modes.inHead(t);
		}
		if (name === "body") {
			const second = open[1];
			if (
				!second ||
				second.tagName !== "body" ||
				open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
			) {
				return;
			}
			framesetOk = false;
			for (const a of t.attrs) {
				if (!second.attributes.some((x) => x.name === a.name)) {
					second.attributes.push(a);
				}
			}
			return;
		}
		if (name === "frameset") {
			const second = open[1];
			if (!second || second.tagName !== "body") return;
			if (!framesetOk) return;
			detach(second);
			while (open.length > 1) open.pop();
			insertHtmlElement("frameset", t.attrs, t.pos);
			mode = "inFrameset";
			return;
		}
		if (
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
			].includes(name)
		) {
			closeIfPInButtonScope();
			insertHtmlElement(name, t.attrs, t.pos);
			return;
		}
		if (HEADING.has(name)) {
			closeIfPInButtonScope();
			if (cur().namespace === NS_HTML && HEADING.has(cur().tagName)) open.pop();
			insertHtmlElement(name, t.attrs, t.pos);
			return;
		}
		if (name === "pre" || name === "listing") {
			closeIfPInButtonScope();
			insertHtmlElement(name, t.attrs, t.pos);
			t.swallowNewline = true;
			framesetOk = false;
			return;
		}
		if (name === "form") {
			if (
				form &&
				!open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
			) {
				return;
			}
			closeIfPInButtonScope();
			const el = insertHtmlElement("form", t.attrs, t.pos);
			if (
				!open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
			) {
				form = el;
			}
			return;
		}
		if (name === "li") {
			framesetOk = false;
			for (let i = open.length - 1; i >= 0; i--) {
				const node = open[i];
				if (node.namespace === NS_HTML && node.tagName === "li") {
					generateImpliedEndTags("li");
					popUntil("li");
					break;
				}
				if (
					isSpecial(node) &&
					!(
						node.namespace === NS_HTML &&
						["address", "div", "p"].includes(node.tagName)
					)
				) {
					break;
				}
			}
			closeIfPInButtonScope();
			insertHtmlElement("li", t.attrs, t.pos);
			return;
		}
		if (name === "dd" || name === "dt") {
			framesetOk = false;
			for (let i = open.length - 1; i >= 0; i--) {
				const node = open[i];
				if (
					node.namespace === NS_HTML &&
					(node.tagName === "dd" || node.tagName === "dt")
				) {
					generateImpliedEndTags(node.tagName);
					popUntil(node.tagName);
					break;
				}
				if (
					isSpecial(node) &&
					!(
						node.namespace === NS_HTML &&
						["address", "div", "p"].includes(node.tagName)
					)
				) {
					break;
				}
			}
			closeIfPInButtonScope();
			insertHtmlElement(name, t.attrs, t.pos);
			return;
		}
		if (name === "plaintext") {
			closeIfPInButtonScope();
			insertHtmlElement("plaintext", t.attrs, t.pos);
			return;
		}
		if (name === "button") {
			if (inScope("button")) {
				generateImpliedEndTags();
				popUntil("button");
			}
			reconstructAfe();
			insertHtmlElement("button", t.attrs, t.pos);
			framesetOk = false;
			return;
		}
		if (name === "a") {
			// if there's an <a> in afe after last marker
			for (let i = afe.length - 1; i >= 0; i--) {
				if (afe[i].marker) break;
				if (afeEl(afe[i]).tagName === "a") {
					adoptionAgency("a", t.pos);
					const idx = afe.findIndex(
						(e) => !e.marker && afeEl(e).tagName === "a"
					);
					if (idx !== -1) {
						const el = afeEl(afe[idx]);
						afe.splice(idx, 1);
						const oi = open.indexOf(el);
						if (oi !== -1) open.splice(oi, 1);
					}
					break;
				}
			}
			reconstructAfe();
			const el = insertHtmlElement("a", t.attrs, t.pos);
			pushAfe(el);
			return;
		}
		if (FORMATTING.has(name) && name !== "a" && name !== "nobr") {
			reconstructAfe();
			const el = insertHtmlElement(name, t.attrs, t.pos);
			pushAfe(el);
			return;
		}
		if (name === "nobr") {
			reconstructAfe();
			if (inScope("nobr")) {
				adoptionAgency("nobr", t.pos);
				reconstructAfe();
			}
			const el = insertHtmlElement("nobr", t.attrs, t.pos);
			pushAfe(el);
			return;
		}
		if (["applet", "marquee", "object"].includes(name)) {
			reconstructAfe();
			insertHtmlElement(name, t.attrs, t.pos);
			insertMarker();
			framesetOk = false;
			return;
		}
		if (name === "table") {
			if (!quirks) closeIfPInButtonScope();
			insertHtmlElement("table", t.attrs, t.pos);
			framesetOk = false;
			mode = "inTable";
			return;
		}
		if (["area", "br", "embed", "img", "keygen", "wbr"].includes(name)) {
			reconstructAfe();
			insertHtmlElement(name, t.attrs, t.pos);
			open.pop();
			framesetOk = false;
			return;
		}
		if (name === "input") {
			// `<input>` inside a select is dropped; if a select is open it is
			// closed first (keygen/textarea no longer behave this way).
			if (inScope("select")) {
				popUntil("select");
				resetInsertionMode();
			} else if (
				fragment &&
				fragment.namespace === NS_HTML &&
				fragment.tagName === "select"
			) {
				return;
			}
			reconstructAfe();
			insertHtmlElement("input", t.attrs, t.pos);
			open.pop();
			const ty = t.attrs.find((a) => a.name === "type");
			if (!ty || ty.value.toLowerCase() !== "hidden") framesetOk = false;
			return;
		}
		if (["param", "source", "track"].includes(name)) {
			insertHtmlElement(name, t.attrs, t.pos);
			open.pop();
			return;
		}
		if (name === "hr") {
			if (cur().namespace === NS_HTML && cur().tagName === "option") open.pop();
			if (cur().namespace === NS_HTML && cur().tagName === "optgroup") {
				open.pop();
			}
			closeIfPInButtonScope();
			insertHtmlElement("hr", t.attrs, t.pos);
			open.pop();
			framesetOk = false;
			return;
		}
		if (name === "image") {
			return startTagInBody({ ...t, name: "img" });
		}
		if (name === "textarea") {
			genericRcdata(t, true);
			framesetOk = false;
			return;
		}
		if (name === "xmp") {
			closeIfPInButtonScope();
			reconstructAfe();
			framesetOk = false;
			genericRawtext(t);
			return;
		}
		if (name === "iframe") {
			framesetOk = false;
			genericRawtext(t);
			return;
		}
		if (name === "noembed") {
			genericRawtext(t);
			return;
		}
		if (name === "noscript" && scriptingFlag) {
			genericRawtext(t);
			return;
		}
		if (name === "select") {
			reconstructAfe();
			if (inScope("select")) {
				generateImpliedEndTags();
				popUntil("select");
				resetInsertionMode();
				return;
			}
			insertHtmlElement("select", t.attrs, t.pos);
			// Marker so a stray formatting end tag (e.g. `</font>`) can't adopt
			// across the select boundary now that select has no own insertion mode.
			insertMarker();
			framesetOk = false;
			return;
		}
		if (name === "optgroup" || name === "option") {
			if (cur().namespace === NS_HTML && cur().tagName === "option") open.pop();
			if (
				name === "optgroup" &&
				cur().namespace === NS_HTML &&
				cur().tagName === "optgroup"
			) {
				open.pop();
			}
			reconstructAfe();
			insertHtmlElement(name, t.attrs, t.pos);
			return;
		}
		if (name === "rb" || name === "rtc") {
			if (inScope("ruby")) generateImpliedEndTags();
			insertHtmlElement(name, t.attrs, t.pos);
			return;
		}
		if (name === "rp" || name === "rt") {
			if (inScope("ruby")) generateImpliedEndTags("rtc");
			insertHtmlElement(name, t.attrs, t.pos);
			return;
		}
		if (name === "math") {
			reconstructAfe();
			const attrs = adjustForeignAttrs(adjustMathmlAttrs(t.attrs), NS_MATHML);
			insertForeignElement("math", NS_MATHML, attrs, t.pos);
			if (t.selfClosing) open.pop();
			return;
		}
		if (name === "svg") {
			reconstructAfe();
			const attrs = adjustForeignAttrs(t.attrs, NS_SVG);
			insertForeignElement("svg", NS_SVG, attrs, t.pos);
			if (t.selfClosing) open.pop();
			return;
		}
		if (
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
			].includes(name)
		) {
			return;
		}
		// any other start tag
		reconstructAfe();
		insertHtmlElement(name, t.attrs, t.pos);
	};

	const adjustMathmlAttrs = (/** @type {HtmlAttribute[]} */ attrs) =>
		attrs.map((a) =>
			a.name === "definitionurl"
				? { ...a, name: "definitionURL", serializedName: "definitionURL" }
				: a
		);

	const endTagInBody = (/** @type {EndTagToken} */ t) => {
		const name = t.name;
		if (name === "template") return modes.inHead(t);
		if (name === "select") {
			if (!inScope("select")) return;
			generateImpliedEndTags();
			popUntil("select");
			return;
		}
		if (name === "body" || name === "html") {
			if (!inScope("body")) return;
			mode = "afterBody";
			if (name === "html") process(t);
			return;
		}
		if (
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
			].includes(name)
		) {
			if (!inScope(name)) return;
			generateImpliedEndTags();
			popUntil(name);
			return;
		}
		if (name === "form") {
			if (
				!open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
			) {
				const node = form;
				form = null;
				if (!node || !inScopeEl(node)) return;
				generateImpliedEndTags();
				const idx = open.indexOf(node);
				if (idx !== -1) open.splice(idx, 1);
			} else {
				if (!inScope("form")) return;
				generateImpliedEndTags();
				popUntil("form");
			}
			return;
		}
		if (name === "p") {
			if (!inButtonScope("p")) insertHtmlElement("p", [], t.pos);
			closePElement();
			return;
		}
		if (name === "li") {
			if (!inListItemScope("li")) return;
			generateImpliedEndTags("li");
			popUntil("li");
			return;
		}
		if (name === "dd" || name === "dt") {
			if (!inScope(name)) return;
			generateImpliedEndTags(name);
			popUntil(name);
			return;
		}
		if (HEADING.has(name)) {
			if (![...HEADING].some((h) => inScope(h))) return;
			generateImpliedEndTags();
			popUntilOneOf(HEADING);
			return;
		}
		if (name === "sarcasm") {
			/* take a deep breath */
		}
		if (FORMATTING.has(name)) {
			adoptionAgency(name, t.pos);
			return;
		}
		if (["applet", "marquee", "object"].includes(name)) {
			if (!inScope(name)) return;
			generateImpliedEndTags();
			popUntil(name);
			clearAfeToMarker();
			return;
		}
		if (name === "br") {
			reconstructAfe();
			insertHtmlElement("br", [], t.pos);
			open.pop();
			framesetOk = false;
			return;
		}
		// any other end tag
		for (let i = open.length - 1; i >= 0; i--) {
			const node = open[i];
			if (node.namespace === NS_HTML && node.tagName === name) {
				generateImpliedEndTags(name);
				while (open.length > i) {
					open[open.length - 1].end = tokenEnd;
					open.pop();
				}
				return;
			}
			if (isSpecial(node)) return;
		}
	};

	// generic RCDATA/RAWTEXT: tokenizer already emits the text + end tag, so we
	// just insert the element and switch to "text" mode; text mode appends chars
	// and the matching end tag pops.
	const genericRawtext = (/** @type {StartTagToken} */ t) => {
		insertHtmlElement(t.name, t.attrs, t.pos);
		originalMode = mode;
		mode = "text";
	};
	const genericRcdata = (/** @type {StartTagToken} */ t, swallow = false) => {
		insertHtmlElement(t.name, t.attrs, t.pos);
		if (swallow) t.swallowNewline = true;
		originalMode = mode;
		mode = "text";
	};

	modes.text = (t) => {
		if (t.type === "char") {
			insertCharacters(t.data, t.start, t.end);
			return;
		}
		if (t.type === "eof") {
			if (open.length) open.pop();
			mode = /** @type {string} */ (originalMode);
			process(t);
			return;
		}
		if (t.type === "endTag") {
			// Treat as rawtext rather than an end tag when it can't close the
			// current element: a non-matching name (e.g. a fragment context), or
			// a name that ran straight to EOF with no delimiter (`</script` at
			// EOF — the tokenizer still emits a partial tag there).
			if (cur() && (t.name !== cur().tagName || t.pos.end === t.pos.nameEnd)) {
				insertCharacters(
					source.slice(t.pos.start, t.pos.end),
					t.pos.start,
					t.pos.end
				);
				return;
			}
			open.pop();
			mode = /** @type {string} */ (originalMode);
		}
	};

	// ---------- table modes ----------
	/** @type {{ list: CharToken[], hasNonWs: boolean } | null} */
	let pendingTableChars = null;

	modes.inTable = (t) => {
		if (t.type === "char") {
			const c = cur();
			if (
				["table", "tbody", "tfoot", "thead", "tr"].includes(c.tagName) &&
				c.namespace === NS_HTML
			) {
				pendingTableChars = { list: [], hasNonWs: false };
				originalMode = mode;
				mode = "inTableText";
				return process(t);
			}
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag") {
			const name = t.name;
			if (name === "caption") {
				clearStackToTableContext();
				insertMarker();
				insertHtmlElement("caption", t.attrs, t.pos);
				mode = "inCaption";
				return;
			}
			if (name === "colgroup") {
				clearStackToTableContext();
				insertHtmlElement("colgroup", t.attrs, t.pos);
				mode = "inColumnGroup";
				return;
			}
			if (name === "col") {
				clearStackToTableContext();
				insertHtmlElement("colgroup", [], t.pos);
				mode = "inColumnGroup";
				return process(t);
			}
			if (["tbody", "tfoot", "thead"].includes(name)) {
				clearStackToTableContext();
				insertHtmlElement(name, t.attrs, t.pos);
				mode = "inTableBody";
				return;
			}
			if (["td", "th", "tr"].includes(name)) {
				clearStackToTableContext();
				insertHtmlElement("tbody", [], t.pos);
				mode = "inTableBody";
				return process(t);
			}
			if (name === "table") {
				if (!inTableScope(["table"])) return;
				popUntil("table");
				resetInsertionMode();
				return process(t);
			}
			if (["style", "script", "template"].includes(name)) {
				return modes.inHead(t);
			}
			if (name === "input") {
				const ty = t.attrs.find((a) => a.name === "type");
				if (ty && ty.value.toLowerCase() === "hidden") {
					insertHtmlElement("input", t.attrs, t.pos);
					open.pop();
					return;
				}
			}
			if (name === "form") {
				if (
					form ||
					open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
				) {
					return;
				}
				form = insertHtmlElement("form", t.attrs, t.pos);
				open.pop();
				return;
			}
		}
		if (t.type === "endTag") {
			if (t.name === "table") {
				if (!inTableScope(["table"])) return;
				popUntil("table");
				resetInsertionMode();
				return;
			}
			if (
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
				].includes(t.name)
			) {
				return;
			}
			if (t.name === "template") return modes.inHead(t);
		}
		if (t.type === "eof") return modes.inBody(t);
		// anything else: foster parenting
		fosterParenting = true;
		modes.inBody(t);
		fosterParenting = false;
	};

	modes.inTableText = (t) => {
		if (t.type === "char") {
			const tc = /** @type {CharToken} */ (
				t.data.includes("\0") ? { ...t, data: t.data.replace(/\0/g, "") } : t
			);
			if (tc.data === "") return;
			const pending = /** @type {{ list: CharToken[], hasNonWs: boolean }} */ (
				pendingTableChars
			);
			pending.list.push(tc);
			if (!isAllWs(tc.data)) pending.hasNonWs = true;
			return;
		}
		// flush
		const chars = /** @type {{ list: CharToken[], hasNonWs: boolean }} */ (
			pendingTableChars
		);
		pendingTableChars = null;
		mode = /** @type {string} */ (originalMode);
		for (const ct of chars.list) {
			if (chars.hasNonWs) {
				fosterParenting = true;
				modes.inBody(ct);
				fosterParenting = false;
			} else {
				insertCharacters(ct.data, ct.start, ct.end);
			}
		}
		process(t);
	};

	const clearStackToTableContext = () => {
		while (open.length) {
			const c = cur();
			if (
				c.namespace === NS_HTML &&
				["table", "template", "html"].includes(c.tagName)
			) {
				break;
			}
			open.pop();
		}
	};
	const clearStackToTableBodyContext = () => {
		while (open.length) {
			const c = cur();
			if (
				c.namespace === NS_HTML &&
				["tbody", "tfoot", "thead", "template", "html"].includes(c.tagName)
			) {
				break;
			}
			open.pop();
		}
	};
	const clearStackToTableRowContext = () => {
		while (open.length) {
			const c = cur();
			if (
				c.namespace === NS_HTML &&
				["tr", "template", "html"].includes(c.tagName)
			) {
				break;
			}
			open.pop();
		}
	};

	modes.inCaption = (t) => {
		if (
			(t.type === "endTag" && t.name === "caption") ||
			(t.type === "startTag" &&
				[
					"caption",
					"col",
					"colgroup",
					"tbody",
					"td",
					"tfoot",
					"th",
					"thead",
					"tr"
				].includes(t.name)) ||
			(t.type === "endTag" && t.name === "table")
		) {
			if (!inTableScope(["caption"])) return;
			generateImpliedEndTags();
			popUntil("caption");
			clearAfeToMarker();
			mode = "inTable";
			if (!(t.type === "endTag" && t.name === "caption")) return process(t);
			return;
		}
		if (
			t.type === "endTag" &&
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
			].includes(t.name)
		) {
			return;
		}
		return modes.inBody(t);
	};

	modes.inColumnGroup = (t) => {
		if (t.type === "char") {
			const r = leadingWs(t, true);
			if (!r) return;
			if (cur().tagName !== "colgroup") return;
			open.pop();
			mode = "inTable";
			process(r);
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "startTag" && t.name === "col") {
			insertHtmlElement("col", t.attrs, t.pos);
			open.pop();
			return;
		}
		if (t.type === "endTag" && t.name === "colgroup") {
			if (cur().tagName !== "colgroup") return;
			open.pop();
			mode = "inTable";
			return;
		}
		if (t.type === "endTag" && t.name === "col") return;
		if (
			(t.type === "startTag" || t.type === "endTag") &&
			t.name === "template"
		) {
			return modes.inHead(t);
		}
		if (t.type === "eof") return modes.inBody(t);
		if (cur().tagName !== "colgroup") return;
		open.pop();
		mode = "inTable";
		process(t);
	};

	modes.inTableBody = (t) => {
		if (t.type === "startTag" && t.name === "tr") {
			clearStackToTableBodyContext();
			insertHtmlElement("tr", t.attrs, t.pos);
			mode = "inRow";
			return;
		}
		if (t.type === "startTag" && (t.name === "th" || t.name === "td")) {
			clearStackToTableBodyContext();
			insertHtmlElement("tr", [], t.pos);
			mode = "inRow";
			return process(t);
		}
		if (t.type === "endTag" && ["tbody", "tfoot", "thead"].includes(t.name)) {
			if (!inTableScope([t.name])) return;
			clearStackToTableBodyContext();
			open.pop();
			mode = "inTable";
			return;
		}
		if (
			(t.type === "startTag" &&
				["caption", "col", "colgroup", "tbody", "tfoot", "thead"].includes(
					t.name
				)) ||
			(t.type === "endTag" && t.name === "table")
		) {
			if (!inTableScope(["tbody", "thead", "tfoot"])) return;
			clearStackToTableBodyContext();
			open.pop();
			mode = "inTable";
			return process(t);
		}
		if (
			t.type === "endTag" &&
			["body", "caption", "col", "colgroup", "html", "td", "th", "tr"].includes(
				t.name
			)
		) {
			return;
		}
		return modes.inTable(t);
	};

	modes.inRow = (t) => {
		if (t.type === "startTag" && (t.name === "th" || t.name === "td")) {
			clearStackToTableRowContext();
			insertHtmlElement(t.name, t.attrs, t.pos);
			mode = "inCell";
			insertMarker();
			return;
		}
		if (t.type === "endTag" && t.name === "tr") {
			if (!inTableScope(["tr"])) return;
			clearStackToTableRowContext();
			open.pop();
			mode = "inTableBody";
			return;
		}
		if (
			(t.type === "startTag" &&
				[
					"caption",
					"col",
					"colgroup",
					"tbody",
					"tfoot",
					"thead",
					"tr"
				].includes(t.name)) ||
			(t.type === "endTag" && t.name === "table")
		) {
			if (!inTableScope(["tr"])) return;
			clearStackToTableRowContext();
			open.pop();
			mode = "inTableBody";
			return process(t);
		}
		if (t.type === "endTag" && ["tbody", "tfoot", "thead"].includes(t.name)) {
			if (!inTableScope([t.name])) return;
			if (!inTableScope(["tr"])) return;
			clearStackToTableRowContext();
			open.pop();
			mode = "inTableBody";
			return process(t);
		}
		if (
			t.type === "endTag" &&
			["body", "caption", "col", "colgroup", "html", "td", "th"].includes(
				t.name
			)
		) {
			return;
		}
		return modes.inTable(t);
	};

	modes.inCell = (t) => {
		if (t.type === "endTag" && (t.name === "td" || t.name === "th")) {
			if (!inTableScope([t.name])) return;
			generateImpliedEndTags();
			popUntil(t.name);
			clearAfeToMarker();
			mode = "inRow";
			return;
		}
		if (
			t.type === "startTag" &&
			[
				"caption",
				"col",
				"colgroup",
				"tbody",
				"td",
				"tfoot",
				"th",
				"thead",
				"tr"
			].includes(t.name)
		) {
			if (!inTableScope(["td"]) && !inTableScope(["th"])) return;
			closeCell();
			return process(t);
		}
		if (
			t.type === "endTag" &&
			["table", "tbody", "tfoot", "thead", "tr"].includes(t.name)
		) {
			if (!inTableScope([t.name])) return;
			closeCell();
			return process(t);
		}
		if (
			t.type === "endTag" &&
			["body", "caption", "col", "colgroup", "html"].includes(t.name)
		) {
			return;
		}
		return modes.inBody(t);
	};
	const closeCell = () => {
		generateImpliedEndTags();
		popUntilOneOf(new Set(["td", "th"]));
		clearAfeToMarker();
		mode = "inRow";
	};

	modes.inTemplate = (t) => {
		if (t.type === "char" || t.type === "comment" || t.type === "doctype") {
			return modes.inBody(t);
		}
		if (t.type === "startTag") {
			if (
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
				].includes(t.name)
			) {
				return modes.inHead(t);
			}
			const map = {
				caption: "inTable",
				colgroup: "inTable",
				tbody: "inTable",
				tfoot: "inTable",
				thead: "inTable",
				col: "inColumnGroup",
				tr: "inTableBody",
				td: "inRow",
				th: "inRow"
			};
			let target = "inBody";
			const tagMode = /** @type {Record<string, string>} */ (map);
			if (tagMode[t.name]) target = tagMode[t.name];
			templateModes[templateModes.length - 1] = target;
			mode = target;
			return process(t);
		}
		if (t.type === "endTag") {
			if (t.name === "template") return modes.inHead(t);
			return;
		}
		if (t.type === "eof") {
			if (
				!open.some((e) => e.tagName === "template" && e.namespace === NS_HTML)
			) {
				return;
			}
			popUntil("template");
			clearAfeToMarker();
			templateModes.pop();
			resetInsertionMode();
			return process(t);
		}
	};

	modes.afterBody = (t) => {
		if (t.type === "char" && isAllWs(t.data)) return modes.inBody(t);
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end, {
				parent: open[0],
				beforeNode: null
			});
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "endTag" && t.name === "html") {
			if (fragment) return;
			mode = "afterAfterBody";
			return;
		}
		if (t.type === "eof") return;
		mode = "inBody";
		process(t);
	};

	modes.inFrameset = (t) => {
		if (t.type === "char") {
			const ws = t.data.replace(/[^\t\n\f\r ]/g, "");
			if (ws) insertCharacters(ws, t.start, t.end);
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "startTag" && t.name === "frameset") {
			insertHtmlElement("frameset", t.attrs, t.pos);
			return;
		}
		if (t.type === "endTag" && t.name === "frameset") {
			if (cur().tagName === "html") return;
			open.pop();
			if (!fragment && cur().tagName !== "frameset") mode = "afterFrameset";
			return;
		}
		if (t.type === "startTag" && t.name === "frame") {
			insertHtmlElement("frame", t.attrs, t.pos);
			open.pop();
			return;
		}
		if (t.type === "startTag" && t.name === "noframes") return modes.inHead(t);
	};

	modes.afterFrameset = (t) => {
		if (t.type === "char") {
			const ws = t.data.replace(/[^\t\n\f\r ]/g, "");
			if (ws) insertCharacters(ws, t.start, t.end);
			return;
		}
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end);
			return;
		}
		if (t.type === "doctype") return;
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "endTag" && t.name === "html") {
			mode = "afterAfterFrameset";
			return;
		}
		if (t.type === "startTag" && t.name === "noframes") return modes.inHead(t);
	};

	modes.afterAfterBody = (t) => {
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end, { parent: doc, beforeNode: null });
			return;
		}
		if (t.type === "doctype") return modes.inBody(t);
		if (t.type === "char" && isAllWs(t.data)) return modes.inBody(t);
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "eof") return;
		mode = "inBody";
		process(t);
	};

	modes.afterAfterFrameset = (t) => {
		if (t.type === "comment") {
			insertComment(t.data, t.start, t.end, { parent: doc, beforeNode: null });
			return;
		}
		if (t.type === "doctype") return modes.inBody(t);
		if (t.type === "char" && isAllWs(t.data)) return modes.inBody(t);
		if (t.type === "startTag" && t.name === "html") return modes.inBody(t);
		if (t.type === "startTag" && t.name === "noframes") return modes.inHead(t);
	};

	// ---------- fragment setup ----------
	if (fragmentContext) {
		let ctxName = fragmentContext.toLowerCase();
		let ctxNs = NS_HTML;
		if (ctxName.startsWith("svg ")) {
			ctxNs = NS_SVG;
			ctxName = ctxName.slice(4);
		} else if (ctxName.startsWith("math ")) {
			ctxNs = NS_MATHML;
			ctxName = ctxName.slice(5);
		}
		fragment = mkEl(ctxName, ctxNs, [], null);
		const htmlEl = mkEl("html", NS_HTML, [], null);
		doc.children.push(htmlEl);
		open.push(htmlEl);
		if (ctxNs !== NS_HTML) {
			mode = "inBody";
		} else if (["title", "textarea"].includes(ctxName)) {
			originalMode = "inBody";
			mode = "text";
		} else if (
			["style", "xmp", "iframe", "noembed", "noframes", "script"].includes(
				ctxName
			)
		) {
			originalMode = "inBody";
			mode = "text";
		} else if (ctxName === "noscript") {
			mode = scriptingFlag ? "text" : "inBody";
		} else if (ctxName === "plaintext") {
			mode = "inBody";
		} else {
			resetInsertionMode();
		}
		if (ctxName === "template") {
			templateModes.push("inTemplate");
			mode = "inTemplate";
		}
	}

	// ---------- tokenizer callbacks ----------
	const decode = walkHtmlTokens.decodeHtmlEntities;

	let swallowNextNewline = false;
	// Set by the tokenizer when it hits EOF mid-tag; such a partial tag is
	// dropped (matching the spec's eof-in-tag handling).
	let eofInTag = false;
	// Set when a `<selectedcontent>` is seen, gating the post-parse mirror pass.
	let sawSelectedContent = false;

	walkHtmlTokens(source, 0, {
		isForeign: () => {
			const ac = adjustedCurrent();
			return open.length > 0 && ac && ac.namespace !== NS_HTML;
		},
		fragmentContext: fragment ? fragment.tagName : undefined,
		parseError: (input, code) => {
			if (code === "eof-in-tag") eofInTag = true;
		},
		doctype: (input, start, end) => {
			// parse doctype name + ids from the raw token (simplified)
			const { name, publicId, systemId } = parseDoctype(
				input.slice(start, end)
			);
			process({ type: "doctype", name, publicId, systemId, start, end });
			return end;
		},
		comment: (input, start, end) => {
			// The tokenizer emits CDATA sections through this callback too.
			if (input.startsWith("<![CDATA[", start)) {
				const ac = adjustedCurrent();
				if (open.length > 0 && ac && ac.namespace !== NS_HTML) {
					const innerEnd = input.endsWith("]]>", end) ? end - 3 : end;
					const data = input.slice(start + 9, innerEnd).replace(/\r\n?/g, "\n");
					if (data !== "") process({ type: "char", data, start, end });
					return end;
				}
				const data = input.slice(
					start + 2,
					input.charCodeAt(end - 1) === 0x3e ? end - 1 : end
				);
				process({ type: "comment", data, start, end });
				return end;
			}
			let s = start;
			let e = end;
			if (input.startsWith("<!--", start)) s = start + 4;
			else if (input.startsWith("<!", start)) s = start + 2;
			else if (input.startsWith("</", start)) s = start + 2;
			else if (input.charCodeAt(start) === 0x3c) s = start + 1;
			if (input.endsWith("-->", end)) e = end - 3;
			else if (input.endsWith("--!>", end)) e = end - 4;
			else if (input.charCodeAt(end - 1) === 0x3e) e = end - 1;
			else if (input.endsWith("--", end)) e = end - 2;
			else if (input.charCodeAt(end - 1) === 0x2d) e = end - 1;
			if (e < s) e = s;
			process({
				type: "comment",
				data: input.slice(s, e).replace(/\0/g, "�"),
				start,
				end
			});
			return end;
		},
		text: (input, start, end) => {
			const s = input.slice(start, end).replace(/\r\n?/g, "\n");
			const top = adjustedCurrent();
			const rawMode =
				mode === "text" ||
				(top && top.namespace === NS_HTML && top.tagName === "plaintext");
			const noDecode =
				top &&
				top.namespace === NS_HTML &&
				[
					"script",
					"style",
					"xmp",
					"iframe",
					"noembed",
					"noframes",
					"plaintext"
				].includes(top.tagName) &&
				(mode === "text" || mode === "inBody");
			let data = noDecode ? s : decode(s, false);
			// In RAWTEXT/RCDATA/script/PLAINTEXT, NULL becomes U+FFFD (tokenizer
			// rule); in data state NULLs pass through to be dropped in "in body".
			if (rawMode) data = data.replace(/\0/g, "�");
			// pre/listing/textarea swallow a leading newline (post entity decode).
			if (swallowNextNewline) {
				swallowNextNewline = false;
				if (data[0] === "\n") data = data.slice(1);
			}
			if (data === "") return end;
			process({ type: "char", data, start, end });
			return end;
		},
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quoteType) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			// Raw (undecoded) value: consumers re-resolve requests from it and the
			// offsets must stay aligned with the source. Entity decoding for the
			// html5lib serializer happens there, not here.
			const value = valueStart !== -1 ? input.slice(valueStart, valueEnd) : "";
			if (!pendingAttrs.some((a) => a.name === name)) {
				pendingAttrs.push({
					name,
					value,
					nameStart,
					nameEnd,
					valueStart,
					valueEnd
				});
			}
			if (valueStart === -1) return nameEnd;
			return quoteType !== walkHtmlTokens.QUOTE_NONE ? valueEnd + 1 : valueEnd;
		},
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			// A start tag the tokenizer only emitted because it hit EOF mid-tag
			// is dropped, matching the spec's eof-in-tag handling.
			if (eofInTag) {
				pendingAttrs = [];
				return end;
			}
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			if (name === "selectedcontent") sawSelectedContent = true;
			const attrs = pendingAttrs;
			pendingAttrs = [];
			const pos = { start, end, tagEnd: end, nameEnd };
			const tok = /** @type {StartTagToken} */ ({
				type: "startTag",
				name,
				attrs,
				selfClosing,
				pos
			});
			process(tok);
			if (tok.swallowNewline) swallowNextNewline = true;
			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			const name = input.slice(nameStart, nameEnd).toLowerCase();
			pendingAttrs = [];
			process({
				type: "endTag",
				name,
				pos: { start, end, tagEnd: end, nameEnd }
			});
			return end;
		}
	});
	process({ type: "eof" });

	if (sawSelectedContent) mirrorSelectedContent(doc, null);

	return doc;
};

/**
 * Deep-clone a node, dropping source offsets so cloned content does not
 * re-emit dependencies.
 * @param {HtmlNode} node node
 * @returns {HtmlNode} clone
 */
const cloneSubtree = (node) => {
	if (node.type !== "element") return { ...node };
	return {
		type: "element",
		tagName: node.tagName,
		namespace: node.namespace,
		attributes: node.attributes.map((a) => ({
			name: a.name,
			value: a.value,
			serializedName: a.serializedName,
			nameStart: -1,
			nameEnd: -1,
			valueStart: -1,
			valueEnd: -1
		})),
		children: node.children.map(cloneSubtree),
		selfClosing: node.selfClosing,
		start: node.start,
		end: node.end,
		tagEnd: node.tagEnd,
		nameEnd: node.nameEnd
	};
};

/**
 * The selected option of a select: the last `<option selected>`, else the
 * first option (scanning direct children and `<optgroup>` children).
 * @param {HtmlElement} select select element
 * @returns {HtmlElement | null} selected option
 */
const selectedOption = (select) => {
	/** @type {HtmlElement[]} */
	const options = [];
	/** @param {HtmlElement} el element */
	const collect = (el) => {
		for (const c of el.children) {
			if (c.type !== "element" || c.namespace !== NS_HTML) continue;
			if (c.tagName === "option") options.push(c);
			else if (c.tagName === "optgroup") collect(c);
		}
	};
	collect(select);
	if (options.length === 0) return null;
	for (let i = options.length - 1; i >= 0; i--) {
		if (options[i].attributes.some((a) => a.name === "selected")) {
			return options[i];
		}
	}
	return options[0];
};

/**
 * Fill each `<selectedcontent>` with a clone of its `<select>`'s selected
 * option subtree (the customizable-select mirroring behavior).
 * @param {HtmlElement | HtmlDocument | HtmlDocumentFragment} node node
 * @param {HtmlElement | null} select nearest ancestor select
 */
const mirrorSelectedContent = (node, select) => {
	const children =
		node.type === "element" && node.templateContent
			? node.templateContent.children
			: node.children;
	for (const child of children) {
		if (child.type !== "element") continue;
		if (child.namespace === NS_HTML && child.tagName === "select") {
			mirrorSelectedContent(child, child);
		} else if (
			select &&
			child.namespace === NS_HTML &&
			child.tagName === "selectedcontent"
		) {
			const option = selectedOption(select);
			if (option) child.children = option.children.map(cloneSubtree);
		} else {
			mirrorSelectedContent(child, select);
		}
	}
};

const parseDoctype = (/** @type {string} */ raw) => {
	// raw like <!DOCTYPE html ...>
	let s = raw.replace(/^<!/i, "").replace(/>$/, "");
	s = s.replace(/^doctype/i, "");
	s = s.trim();
	if (s === "") return { name: "", publicId: null, systemId: null };
	const m = /^([^\s]+)/.exec(s);
	const name = m ? m[1].toLowerCase() : "";
	let publicId = null;
	let systemId = null;
	const pub = /public\s*("([^"]*)"|'([^']*)')(\s*("([^"]*)"|'([^']*)'))?/i.exec(
		s
	);
	if (pub) {
		publicId = pub[2] !== undefined ? pub[2] : pub[3] || "";
		if (pub[5] !== undefined) {
			systemId = pub[6] !== undefined ? pub[6] : pub[7] || "";
		}
	}
	const sys = /system\s*("([^"]*)"|'([^']*)')/i.exec(s);
	if (sys && publicId === null) {
		systemId = sys[2] !== undefined ? sys[2] : sys[3] || "";
	}
	return { name, publicId, systemId };
};

buildHtmlAst.NS_HTML = NS_HTML;
buildHtmlAst.NS_MATHML = NS_MATHML;
buildHtmlAst.NS_SVG = NS_SVG;

module.exports = buildHtmlAst;
