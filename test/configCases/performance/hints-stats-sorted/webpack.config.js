"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "stats",
		unusedRules: true,
		// Any bundle exceeds this, so the size hints always fire.
		maxAssetSize: 1,
		maxEntrypointSize: 1
	},
	module: {
		rules: [
			{ test: /\.js$/, use: [] },
			{ test: /\.never-matches$/, loader: "./loader" }
		]
	},
	plugins: [
		(compiler) => {
			compiler.hooks.done.tap("Test", (stats) => {
				const json = stats.toJson({ all: false, hints: true });
				const messages = (json.hints || []).map((hint) => hint.message);
				// `unusedRules` taps `afterSeal` and the size limits tap `afterEmit`,
				// so insertion puts the rule hint first while sorting puts it last.
				if (messages.length < 2) {
					throw new Error(`expected several hints, got ${messages.length}`);
				}
				const sorted = [...messages].sort();
				if (messages.join("\n") !== sorted.join("\n")) {
					throw new Error(`hints are not sorted:\n${messages.join("\n---\n")}`);
				}
				if (!messages[0].startsWith("asset size limit")) {
					throw new Error(`unexpected first hint: ${messages[0]}`);
				}
				if (
					!messages[messages.length - 1].startsWith(
						"webpack rule recommendations"
					)
				) {
					throw new Error(
						`unexpected last hint: ${messages[messages.length - 1]}`
					);
				}
			});
		}
	]
};
