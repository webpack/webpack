"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		filename: "[name].js"
	},
	module: {
		parser: {
			javascript: {
				worker: ["*audioContext.audioWorklet.addModule()"]
			}
		}
	},
	externalsPresets: {
		node: true
	},
	plugins: [
		function testPlugin(compiler) {
			compiler.hooks.finishMake.tap("test", (compilation) => {
				for (const module of compilation.modules) {
					const name = module.nameForCondition();
					if (name && name.includes("top-level-declarations/index.js")) {
						const topLevelIdents = new Set([
							"a",
							"createRequire",
							"myRequire",
							"b",
							"c",
							"audioContext",
							"d"
						]);
						expect(module.buildInfo.topLevelDeclarations).toEqual(
							topLevelIdents
						);
					}
				}
			});
		}
	]
};
