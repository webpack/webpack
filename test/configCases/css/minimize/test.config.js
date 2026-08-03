"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);

		// Whitespace collapsed; regular comments are dropped, but a `/*!`
		// license/important comment is preserved (the ecosystem default) and keeps
		// its place — here at the very start, before the first rule.
		expect(css).not.toContain("\n");
		expect(css).not.toContain("drop this comment");
		expect(css).toContain("/*! license: keep me */");
		expect(css.startsWith("/*! license: keep me */.a,.b{")).toBe(true);

		// Structural serialize: the space around a declaration `:` is dropped, the
		// selector list is compacted, and the redundant `;` before `}` is removed.
		expect(css).toContain(".a,.b{color:red;background:url(");
		expect(css).toContain(".png)}");

		// Strings and url() bodies stay byte-for-byte identical (the `; } , {`
		// inside the string is never treated as delimiters).
		expect(css).toContain('content:"; } , keep {"}');

		// Custom-property (`--*`) value is opaque — its internal whitespace is kept
		// verbatim (only the surrounding declaration whitespace is trimmed).
		expect(css).toContain("--custom:a  b");
		// Required value whitespace collapses to a single space.
		expect(css).toContain("margin:0 auto");
		// rgb() minifies to the shortest color; `!important` loses its leading space.
		expect(css).toContain("color:#010203!important");
		// calc() operator spaces are meaningful and preserved.
		expect(css).toContain("width:calc(1px + 2px)");

		// Safe value transforms (each value-identical):
		expect(css).toContain(
			".transforms{color:red;background:#abc;" +
				"background-image:linear-gradient(#abc,red);border-color:teal;" +
				"margin:.5px 1px 0;--raw:0.50;fill:red;" +
				"stroke:rgba(0,0,0,.5);outline-color:#0000}"
		);
		// - #FF0000 -> red, #AABBCC -> #abc, rgb(0,128,128) -> teal (name shortest)
		// - rgba(0,0,0,0) (transparent black) -> `#0000`, since this build states
		//   no target and every current engine reads a hex alpha
		// - hashes inside a value function (gradient) are colors too, so shortened
		// - margin numbers normalized (leading/trailing zeros)
		// - custom property `--raw` value stays verbatim (0.50, not normalized)
		// - hsl(0,100%,50%) lands on a byte with nothing to round, so it converts
		//   (one that had to round would keep its function); rgba() kept,
		//   only its numbers normalized (.5)
		// An id selector that looks like a hex color is NOT shortened (ids are
		// case-sensitive and not colors).
		expect(css).toContain("#ABCDEF{x:1}");
		// Input the grammar rejects (`*zoom: 1`) is carried through verbatim
		// instead of being dropped, so minifying loses nothing the source had.
		expect(css).toContain(".hacks{*zoom : 1;_height:1px;color:red}");
		// Whitespace around a top-level combinator (`.c > .d`) is trimmed, but the
		// descendant combinator (the space in `:not(.f) .g`) is meaningful and kept.
		expect(css).toContain(".c>.d,.e{");
		expect(css).toContain(":not(.f) .g{");
		// Interleaved declaration / nested-rule order is preserved.
		expect(css).toContain(".h{color:red;.i{x:1}color:green}");
		// @media prelude collapses, its block trims, and the whitespace around the
		// feature test's `:` — insignificant in a query condition — goes.
		expect(css).toContain("@media screen and (width>=100px){");
	}
};
