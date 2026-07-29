"use strict";

// Tests the tokenizer's `getContentModeForTag()` switch for fragment contexts
// that start in RCDATA, RAWTEXT, script-data, and plaintext states.
/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "rcdata",
		module: {
			rules: [
				{
					test: /rcdata\.html$/,
					type: "html",
					parser: { as: "textarea" }
				}
			]
		},
		experiments: { html: true }
	},
	{
		name: "rawtext",
		module: {
			rules: [
				{
					test: /rawtext\.html$/,
					type: "html",
					parser: { as: "style" }
				}
			]
		},
		experiments: { html: true }
	},
	{
		name: "script-data",
		module: {
			rules: [
				{
					test: /scriptdata\.html$/,
					type: "html",
					parser: { as: "script" }
				}
			]
		},
		experiments: { html: true }
	},
	{
		name: "plaintext",
		module: {
			rules: [
				{
					test: /plaintext\.html$/,
					type: "html",
					parser: { as: "plaintext" }
				}
			]
		},
		experiments: { html: true }
	}
];
