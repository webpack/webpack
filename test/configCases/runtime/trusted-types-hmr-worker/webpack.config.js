"use strict";

// HMR alone pulls in the chunk loader, whose `importScripts` is wrapped by
// `createScriptUrl` under trusted types — so the helper has to be required there too.

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

// Built here so the needles are not source literals the search would find.
const CALL = `${"__webpack_require__"}.tu(`;
const DEFINE = `${"__webpack_require__"}.tu =`;

/**
 * @param {number} index position of this config, so it finds its own bundle
 * @param {string} target compilation target
 * @returns {import("../../../../").Configuration} configuration
 */
const base = (index, target) => {
	const filename = `bundle${index}.js`;
	return {
		mode: "development",
		devtool: false,
		target,
		output: { filename, trustedTypes: { policyName: "wp" } },
		plugins: [
			new webpack.HotModuleReplacementPlugin(),
			(compiler) => {
				compiler.hooks.done.tap("Test", (stats) => {
					const outputPath = /** @type {string} */ (
						stats.compilation.outputOptions.path
					);
					const source = fs.readFileSync(
						path.join(outputPath, filename),
						"utf8"
					);
					expect(source).toContain(CALL);
					expect(source).toContain(DEFINE);
				});
			}
		]
	};
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [base(0, "webworker")];
