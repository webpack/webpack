"use strict";

const webpack = require("../../../../");

/** @typedef {import("../../../../").Configuration} Configuration */

/**
 * @param {Configuration} config config
 * @param {boolean=} css whether the build loads a stylesheet chunk
 * @returns {Configuration} config with the shared options
 */
const withDefaults = (config, css = false) => ({
	mode: "development",
	devtool: false,
	...config,
	optimization: { chunkIds: "named" },
	experiments: css ? { css: true } : {},
	plugins: [new webpack.DefinePlugin({ CSS: JSON.stringify(css) })]
});

/** @type {Configuration[]} */
module.exports = [
	withDefaults({ target: "web" }),
	withDefaults({
		target: "web",
		output: { chunkFilename: "dir%41/[name].js" }
	}),
	withDefaults({ target: "web" }, true),
	withDefaults({ target: "webworker" }),
	withDefaults({ target: "node" }),
	withDefaults({ target: "node", output: { module: true } })
];
