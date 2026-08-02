/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

// The tables the HTML minifier decides with, kept out of the algorithm the way
// `lib/css/data.js` is. That one is generated from `mdn-data`; these are
// transcribed from the WHATWG spec, because no dataset states them in a form a
// generator could read yet.
//
// TODO derive these instead of transcribing them. `@mdn/browser-compat-data`
// carries the element/attribute inventory, but not "is this attribute boolean
// on this element" or the optional-tag conditions, so a generator would still
// need the spec text — see `tooling/generate-css-data.js` for the shape it
// should take once a source exists.

/**
 * §13.1.2.4: the elements a `<p>` end tag may be omitted in front of.
 * @type {Set<string>}
 */
const P_FOLLOWED_BY = new Set([
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
]);

/**
 * §13.1.2.4: the element names whose end tag may be omitted when the next
 * sibling is one of the mapped names. `<html>`, `<head>` and `<body>` are
 * deliberately absent — their end tags are omissible too, but non-browser
 * consumers routinely mis-parse a document that is missing them.
 * @type {Map<string, Set<string>>}
 */
const OPTIONAL_END_TAG_FOLLOWERS = new Map([
	["li", new Set(["li"])],
	["dt", new Set(["dt", "dd"])],
	["dd", new Set(["dd", "dt"])],
	["rt", new Set(["rt", "rp"])],
	["rp", new Set(["rt", "rp"])],
	["optgroup", new Set(["optgroup"])],
	["option", new Set(["option", "optgroup"])],
	["thead", new Set(["tbody", "tfoot"])],
	["tbody", new Set(["tbody", "tfoot"])],
	["tfoot", new Set()],
	["tr", new Set(["tr"])],
	["td", new Set(["td", "th"])],
	["th", new Set(["td", "th"])],
	["p", P_FOLLOWED_BY]
]);

/**
 * The subset of `OPTIONAL_END_TAG_FOLLOWERS` that may also drop the end tag with
 * nothing left in the parent. `<dt>` and `<thead>` are absent: the spec gives
 * them no such clause.
 * @type {Set<string>}
 */
const OPTIONAL_END_TAG_AT_END = new Set([
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
]);

/**
 * §13.1.2.4: a trailing `</p>` stays inside these, whose content model would
 * otherwise absorb what follows.
 * @type {Set<string>}
 */
const P_KEEPS_END_TAG_IN = new Set([
	"a",
	"audio",
	"del",
	"ins",
	"map",
	"noscript",
	"video"
]);

/**
 * §2.4.2 boolean attributes, mapped to the elements each one is boolean *on*
 * (`null` = a global attribute). Elsewhere the same name is an ordinary
 * attribute whose value a script may read.
 * @type {Map<string, Set<string> | null>}
 */
const BOOLEAN_ATTRIBUTES = new Map([
	["allowfullscreen", new Set(["iframe"])],
	["async", new Set(["script"])],
	["autofocus", null],
	["autoplay", new Set(["audio", "video"])],
	["checked", new Set(["input"])],
	["controls", new Set(["audio", "video"])],
	["default", new Set(["track"])],
	["defer", new Set(["script"])],
	[
		"disabled",
		new Set([
			"button",
			"fieldset",
			"input",
			"link",
			"optgroup",
			"option",
			"select",
			"textarea"
		])
	],
	["formnovalidate", new Set(["button", "input"])],
	["inert", null],
	["ismap", new Set(["img"])],
	["itemscope", null],
	["loop", new Set(["audio", "video"])],
	["multiple", new Set(["input", "select"])],
	["muted", new Set(["audio", "video"])],
	["nomodule", new Set(["script"])],
	["novalidate", new Set(["form"])],
	["open", new Set(["details", "dialog"])],
	["playsinline", new Set(["video"])],
	["readonly", new Set(["input", "textarea"])],
	["required", new Set(["input", "select", "textarea"])],
	["reversed", new Set(["ol"])],
	["selected", new Set(["option"])]
]);

/**
 * The attributes whose value is a srcset (WHATWG "parse a srcset attribute").
 * @type {Set<string>}
 */
const SRCSET_ATTRIBUTES = new Set(["srcset", "imagesrcset"]);

/**
 * The attributes whose value is an ASCII-whitespace-separated token list, so
 * collapsing its separators keeps the set the DOM reads. `for` is absent: on
 * `<output>` it is a token list, but on `<label>` it is one id, and an id may
 * contain a space.
 * @type {Set<string>}
 */
const TOKEN_LIST_ATTRIBUTES = new Set([
	"accesskey",
	"blocking",
	"class",
	"headers",
	"itemprop",
	"itemref",
	"itemtype",
	"part",
	"ping",
	"rel",
	"sandbox"
]);

module.exports.BOOLEAN_ATTRIBUTES = BOOLEAN_ATTRIBUTES;
module.exports.OPTIONAL_END_TAG_AT_END = OPTIONAL_END_TAG_AT_END;
module.exports.OPTIONAL_END_TAG_FOLLOWERS = OPTIONAL_END_TAG_FOLLOWERS;
module.exports.P_FOLLOWED_BY = P_FOLLOWED_BY;
module.exports.P_KEEPS_END_TAG_IN = P_KEEPS_END_TAG_IN;
module.exports.SRCSET_ATTRIBUTES = SRCSET_ATTRIBUTES;
module.exports.TOKEN_LIST_ATTRIBUTES = TOKEN_LIST_ATTRIBUTES;
