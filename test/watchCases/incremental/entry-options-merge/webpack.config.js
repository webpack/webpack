"use strict";

/** @type {import("webpack").Configuration} */
module.exports = {
	mode: "development",
	entry: {},
	output: { filename: "fallback.js" },
	plugins: [
		(compiler) => {
			const { EntryPlugin } = compiler.webpack;
			new EntryPlugin(compiler.context, "./bootstrap.js", {
				name: "main"
			}).apply(compiler);
			new EntryPlugin(compiler.context, "./index.js", {
				name: "main",
				filename: "custom.js"
			}).apply(compiler);
		}
	]
};
