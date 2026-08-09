"use strict";

// cspell:ignore basefont bgsound framesets isindex malignmark menuitem mglyph
// cspell:ignore noembed noframes optgroup reparent spacer

// Insertion-mode coverage for the tree builder in `lib/html/syntax.js`.
//
// The html5lib tree-construction corpus already asserts these arcs, but it is
// an optional git submodule that is skipped when absent — leaving the shipped
// insertion modes covered only when someone checked it out. Each input below is
// the smallest one from that corpus that reaches an arc nothing else here does,
// re-asserted against a snapshot of the serialized tree so the whole tree is
// reviewed as one diff rather than one hand-picked node.

const { A, parseHtml } = require("../lib/html/syntax");
const serializeHtmlTree = require("./helpers/serializeHtmlTree");

/**
 * @param {string} source HTML
 * @param {string=} fragmentContext context element for fragment parsing
 * @returns {string} the serialized tree
 */
const treeOf = (source, fragmentContext) => {
	const doc = parseHtml(source, 0, { fragmentContext });
	// In fragment mode the tree is the children of the synthesized root.
	const first = A.firstChild(doc);
	return serializeHtmlTree(fragmentContext && first !== 0 ? first : doc);
};

/** @type {[string, string, (string | undefined)][]} */
const CASES = [
	[
		"fosters an adoption-agency reparent out of a table",
		"<!doctype html><table><td><table><i>a<div>b<b>c</i>d",
		undefined
	],
	[
		"ignores every end tag the in-table insertion mode has no arc for",
		"<table><tr></strong></b></em></i></u></strike></s></blink></tt></pre></big></small></font></select></h1></h2></h3></h4></h5></h6></body></br></a></img></title></span></style></script></table></th></td></tr></frame></area></link></param></hr></input></col></base></meta></basefont></bgsound></embed></spacer></p></dd></dt></caption></colgroup></tbody></tfoot></thead></address></blockquote></center></dir></div></dl></fieldset></listing></menu></ol></ul></li></nobr></wbr></form></button></marquee></object></html></frameset></head></iframe></image></isindex></noembed></noframes></noscript></optgroup></option></plaintext></textarea>",
		undefined
	],
	[
		"nests framesets and switches to after-frameset",
		"<frame></frame></frame><frameset><frame><frameset><frame></frameset><noframes></frameset><noframes>",
		undefined
	],
	["closes a foreign element by its own end tag", "<g></path>X", "svg path"],
	["opens a template with no body yet", "<head></head><template>", undefined],
	[
		"re-nests a badly nested table, font and anchor",
		"<TABLE>\n<TR>\n<CENTER><CENTER><TD></TD></TR><TR>\n<FONT>\n<TABLE><tr></tr></TABLE>\n</P>\n<a></font><font></a>\nThis page contains an insanely badly-nested tag sequence.",
		undefined
	],
	[
		"parses a template fragment with a form in it",
		'<template><form><input name="q"></form><div>second</div></template>',
		"template"
	],
	[
		"breaks a paragraph out of foreign content",
		"<!doctype html><p><math></p>a",
		undefined
	],
	[
		"ignores a second form in a table",
		"<!doctype html><table><form><form>",
		undefined
	],
	["closes an implied tbody from a cell", "<table><td></tbody>A", undefined],
	[
		"ends a template inside a table body",
		"<table><tbody><template></tbody></template>",
		undefined
	],
	[
		"pops a select and a template out of a cell",
		"<body><table><tr><td><select><template>Foo</template><caption>A</table>",
		undefined
	],
	[
		"keeps an end tag inside a script fragment",
		"<!-- inside </script> -->",
		"script"
	],
	[
		"foster-parents text out of a column group",
		"<table><colgroup> foo</colgroup></table>",
		undefined
	],
	[
		"breaks out of MathML text integration points",
		"<b></b><mglyph/><i></i><malignmark/><u></u><ms/>X",
		"math ms"
	],
	[
		"handles a break and a comment in head noscript",
		"<head><noscript></br><!--foo--></noscript>",
		undefined
	],
	[
		"implies the end of a ruby base",
		"<html><ruby>a<rb>b<rb></ruby></html>",
		undefined
	],
	[
		"appends a comment after the body to the html element",
		"<!doctype html><html></p><!--foo-->",
		undefined
	],
	[
		"opens a column group inside a template",
		"<body><template><col><colgroup>",
		undefined
	],
	["reads a textarea fragment as text", "direct textarea content", "textarea"],
	["ends a caption fragment", "</caption><div>", "caption"],
	["ends a frameset fragment", "</frameset><frame>", "frameset"],
	[
		"foster-parents a formatting element out of a table",
		"<table><a>1<td>2</td>3</table>",
		undefined
	],
	[
		"runs the adoption agency past its outer-loop limit",
		"<div><a><b><div><div><div><div><div><div><div><div><div><div></a>",
		undefined
	],
	[
		"reconstructs nobr across a table and a marquee",
		"<nobr><table><marquee></table><nobr>",
		undefined
	],
	[
		"ignores a doctype inside a column group",
		"<table><colgroup><!DOCTYPE html></colgroup></table>",
		undefined
	],
	[
		"ignores a doctype in foreign content",
		"<svg><!DOCTYPE html></svg>",
		undefined
	],
	["parses a body start tag in an SVG desc fragment", "<body>X", "svg desc"],
	[
		"ignores a stray menuitem end tag",
		"<!DOCTYPE html><head></menuitem>",
		undefined
	],
	[
		"ignores the end tags a cell has no arc for",
		"<table><td></body></caption></col></colgroup></html>foo",
		undefined
	],
	[
		"ignores a template end tag with no template open",
		"<div></template></div>",
		undefined
	],
	[
		"opens a row inside a template",
		"<body><template><tr><div></div></tr></template>",
		undefined
	],
	[
		"merges html attributes across a template",
		"<html a=b><template><div><html b=c><span></template>",
		undefined
	],
	[
		"leaves annotation-xml when its SVG child closes",
		"<math><annotation-xml><svg></svg></annotation-xml><mi>",
		undefined
	],
	[
		"reads noframes text after the frameset closed",
		"<!doctype html><frameset></frameset><noframes>abc",
		undefined
	],
	[
		"closes an optgroup when the next one opens",
		"<!DOCTYPE html><select><optgroup><option><optgroup>",
		undefined
	],
	[
		"reopens a form once the table that held it closed",
		"<!doctype html><table><form></table><form>",
		undefined
	],
	[
		"ignores a plaintext end tag in a plaintext fragment",
		"</plaintext>",
		"plaintext"
	],
	[
		"ignores the end tags a table body has no arc for",
		"<table><tbody></body></caption></col></colgroup></html></td></th></tr>",
		undefined
	],
	["drops an input from a select fragment", "<input><option>", "select"],

	// A stray DOCTYPE, a repeated `<html>` or a repeated `<head>`/`<body>` has
	// its own arc in every insertion mode, and each one is a separate ignore.
	[
		"ignores a second doctype before html",
		"<!DOCTYPE html><!DOCTYPE html>",
		undefined
	],
	["ignores a doctype before head", "<html><!DOCTYPE html>", undefined],
	[
		"ignores a doctype in head",
		"<html><head><!DOCTYPE html></head>",
		undefined
	],
	[
		"ignores a doctype after head",
		"<html><head></head><!DOCTYPE html>",
		undefined
	],
	[
		"ignores a doctype after the body",
		"<body></body><!DOCTYPE html>",
		undefined
	],
	[
		"ignores a doctype after after the body",
		"<html><body></body></html><!DOCTYPE html>",
		undefined
	],
	[
		"merges a repeated html start tag before head",
		"<!DOCTYPE html><html><html abc:def=gh><xyz:abc></xyz:abc>",
		undefined
	],
	[
		"merges a repeated html start tag in head",
		"<!DOCTYPE html><head><html id=x>",
		undefined
	],
	[
		"merges a repeated html start tag after head",
		"<!doctype html><html a=b><head></head><html c=d>",
		undefined
	],
	[
		"merges a repeated html start tag after the body",
		'<!DOCTYPE html>X</body><html id="x">',
		undefined
	],
	[
		"merges a repeated html start tag in head noscript",
		'<head><noscript><html class="foo"><!--foo--></noscript>',
		undefined
	],
	[
		"treats an html start tag in a column group as in-body",
		"<table><colgroup><html></colgroup></table>",
		undefined
	],
	[
		"ignores a repeated head start tag after head",
		"<html><head></head><template></template><head>",
		undefined
	],
	[
		"ignores a repeated head end tag in head",
		"<!DOCTYPE html><HTML><META><HEAD></HEAD></HTML>",
		undefined
	],
	[
		"ignores a paragraph end tag after head",
		"<!doctype html><head></head></p><!--foo-->",
		undefined
	],
	[
		"merges a repeated body start tag inside a template",
		"<body a=b><template><div></div><body c=d><div></div></body></template></body>",
		undefined
	],
	["ends the body from an html fragment", "<body></body></html>", "html"],

	// NUL handling and text insertion.
	["drops a NUL before a frameset", "<html>\0<frameset></frameset>", undefined],
	[
		"keeps a frameset out once text arrived",
		"<html>a\0a<frameset></frameset>",
		undefined
	],
	[
		"foster-parents text between two formatting elements",
		"<!doctype html>a<i>b<table>c<b>d</i>e</b>f",
		undefined
	],
	[
		"strips the newline a pre element starts with",
		"<!DOCTYPE html><html><head></head><body><pre>\n</pre></body></html>",
		undefined
	],

	// Table-related modes reached through a template or a fragment.
	[
		"ignores a table end tag inside a template",
		"<body><template><thead></thead></table><tbody></tbody></template></body>",
		undefined
	],
	[
		"ignores a row end tag inside a template",
		"<body><template><td></td></tr><td></td></template>",
		undefined
	],
	[
		"ignores a row end tag inside a template cell",
		"<body><table><template><td></tr><div></template></table>",
		undefined
	],
	[
		"ignores a column group end tag inside a template",
		"<body><template><col></colgroup>",
		undefined
	],
	[
		"ends a column group on text inside a template",
		"<body><template><col>Hello",
		undefined
	],
	[
		"closes a cell on a mismatched th end tag",
		"<table><tr><td></th>",
		undefined
	],
	[
		"ignores table-section end tags in a row fragment",
		"</tbody></tfoot></thead><td>",
		"tr"
	],
	[
		"ignores a thead end tag in a table body",
		"<table><tbody></thead>",
		undefined
	],
	["opens an implied tbody in a table fragment", "<table><tr>", "table"],
	[
		"clears a table body context across nested tables",
		"<a><table><td><a><table></table><a></tr><a></table><b>X</b>C<a>Y",
		undefined
	],
	[
		"runs thorough implied end tags for a template in a table",
		"<table><thead><template><td></template></table>",
		undefined
	],

	// Foreign content and scope boundaries.
	["ignores a foreign end tag with no match", "</path>X", "svg path"],
	[
		"ignores a frameset start tag in an SVG desc fragment",
		"<frameset>X",
		"svg desc"
	],
	[
		"ignores a tbody start tag in a MathML thead fragment",
		"<math><thead><mo><tbody>",
		"thead"
	],
	["closes a div across an SVG element", "<div><svg></div>a", undefined],
	[
		"treats a self-closed math element as foreign",
		"<!doctype html><math/><foo>",
		undefined
	],

	// Arcs the corpus does not reach at all.
	[
		"ignores a second form end tag inside a template",
		"<template><form></form></form></template>",
		undefined
	],
	[
		"drops a table cell holding nothing but a NUL",
		"<table>\0</table>",
		undefined
	],
	[
		"ignores a template end tag after head",
		"<head></head></template>",
		undefined
	]
];

describe("parseHtml — insertion modes", () => {
	for (const [name, source, fragmentContext] of CASES) {
		it(`should ${name}`, () => {
			expect(treeOf(source, fragmentContext)).toMatchSnapshot();
		});
	}
});
