"use strict";

// `parser.html.as` selects the parse mode, mirroring the CSS parser's `as`.
// `"document"` (the default) parses a full page; any other value names the
// context element to parse the source as that element's inner HTML (a
// fragment) — `"template"` for a neutral fragment, `"tbody"` to keep a bare
// `<tr><td>`. An incompatible context like `"div"` drops them, just like a
// full-document parse.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		rules: [
			{
				test: /template\.html$/,
				parser: {
					as: "template"
				}
			},
			{
				test: /tbody\.html$/,
				parser: {
					as: "tbody"
				}
			},
			{
				test: /div\.html$/,
				parser: {
					as: "div"
				}
			}
		]
	},
	experiments: {
		html: true
	}
};
