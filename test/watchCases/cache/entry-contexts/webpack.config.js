"use strict";

const path = require("path");

/** @import { Configuration } from "../../../../" */

/** @type {Configuration} */
module.exports = {
	mode: "development",
	entry: {},
	plugins: [
		(compiler) => {
			const { EntryPlugin } = compiler.webpack;
			new EntryPlugin(path.join(compiler.context, "a"), "./part.js", {
				name: "bundle"
			}).apply(compiler);
			new EntryPlugin(path.join(compiler.context, "b"), "./part.js", {
				name: "bundle"
			}).apply(compiler);
			new EntryPlugin(compiler.context, "./index.js", { name: "bundle" }).apply(
				compiler
			);
		}
	]
};
