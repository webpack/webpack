"use strict";

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		clean: { dry: true },
		copy: [{ from: "static", to: "../copy-clean-outside-dry" }]
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			// output.path is known once the options are applied
			compiler.hooks.initialize.tap("Test", () => {
				const outside = path.join(
					compiler.outputPath,
					"..",
					"copy-clean-outside-dry"
				);
				compiler.options.output.allowOutside = [outside];
				rimraf.sync(outside);
				fs.mkdirSync(outside, { recursive: true });
				// written by someone else, never by this build
				fs.writeFileSync(path.join(outside, "foreign.txt"), "");
			});
		}
	]
};
