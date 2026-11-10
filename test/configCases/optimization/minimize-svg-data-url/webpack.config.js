"use strict";

/** @type {(name: string, options: import("../../../../").Configuration) => import("../../../../").Configuration} */
const config = (name, options) => ({
	target: "web",
	mode: "production",
	output: {
		filename: `${name}.js`,
		cssFilename: `${name}.css`,
		htmlFilename: `${name}.html`,
		pathinfo: false
	},
	module: {
		generator: { html: { extract: true } },
		parser: { html: { sources: false }, css: { url: false } }
	},
	experiments: { css: true, html: true, futureDefaults: true },
	...options,
	optimization: {
		minimize: true,
		minimizer: ["..."],
		...options.optimization
	}
});

module.exports = [
	// The XML minimizer futureDefaults turns on minifies them.
	config("future", {}),
	// Turned off, they are left as written.
	config("disabled", { optimization: { minimizeOptions: { xml: false } } })
];
