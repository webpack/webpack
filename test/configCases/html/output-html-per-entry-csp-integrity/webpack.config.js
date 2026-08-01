"use strict";

// `csp` and `integrity` are resolved when a page is emitted, so an entry's
// `html` object overrides `output.html` for its own page only.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

/** @type {import("../../../../").WebpackPluginInstance} */
const copyTest = {
	apply(compiler) {
		compiler.hooks.compilation.tap("Test", (compilation) => {
			compilation.hooks.processAssets.tap(
				{
					name: "copy-test",
					stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
				},
				() => {
					compilation.emitAsset(
						"test.js",
						new webpack.sources.RawSource(
							fs.readFileSync(path.resolve(__dirname, "test.js"))
						)
					);
				}
			);
		});
	}
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	entry: {
		inherit: "./src/main.js",
		"csp-off": { import: "./src/main.js", html: { csp: false } },
		"integrity-off": { import: "./src/main.js", html: { integrity: false } },
		"csp-policy": {
			import: "./src/main.js",
			html: { csp: { policy: { "img-src": ["'self'"] } } }
		},
		// an authored page needs no wrapper, but its entry's options still apply
		authored: {
			import: "./src/page.html",
			html: { csp: false, integrity: false }
		}
	},
	output: {
		filename: "[name].js",
		crossOriginLoading: "anonymous",
		html: { csp: true, integrity: true }
	},
	experiments: { html: true },
	plugins: [copyTest]
};
