"use strict";

// `"..."` keeps every built-in source, and `type: false` disables one of them —
// here the built-in `<img src>` — while a custom `data-src` is added. So the
// default `src` is left untouched and only `data-src` is rewritten.
/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		assetModuleFilename: "[name][ext]"
	},
	module: {
		parser: {
			html: {
				sources: [
					"...",
					{ tag: "img", attribute: "src", type: false },
					{ tag: "img", attribute: "data-src", type: "src" }
				]
			}
		}
	},
	experiments: {
		html: true
	}
};
