"use strict";

/** @type {(name: string, xml: Record<string, boolean> | undefined) => import("../../../../").Configuration} */
const config = (name, xml) => ({
	target: "web",
	mode: "production",
	output: {
		// One output directory holds both builds, so each names its own files.
		filename: `${name}.js`,
		htmlFilename: `${name}/[name].html`,
		htmlChunkFilename: `${name}/[name].html`,
		pathinfo: false
	},
	module: {
		generator: { html: { extract: true } },
		parser: { html: { sources: false } }
	},
	optimization: {
		minimize: true,
		minimizer: ["..."],
		minimizeOptions: xml === undefined ? {} : { xml }
	},
	experiments: {
		css: true,
		html: true
	}
});

module.exports = [
	// No XML minimizer: inline SVG prints as HTML's own foreign content.
	config("default", undefined),
	// The `.svg` assets' switches reach an inline `<svg>` and an SVG `data:` URL.
	config("svg", {
		removeMetadata: true,
		shortenNumbers: true,
		shortenPathData: true
	})
];
