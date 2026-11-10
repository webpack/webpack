"use strict";

const path = require("path");
const currentWatchStep = require("../../../helpers/currentWatchStep");

/** @type {import("webpack").Configuration[]} */
module.exports = ["memory", "filesystem"].map((type) => ({
	mode: "development",
	entry: { main: "./index.js", trigger: "./tick.js" },
	cache: type === "memory" ? { type: "memory" } : { type: "filesystem" },
	experiments: { cacheUnaffected: true },
	optimization: { providedExports: false },
	output: { filename: `${type}-[name].js`, clean: false },
	plugins: [
		(compiler) => {
			compiler.hooks.compilation.tap("ChangeExportsType", (compilation) => {
				compilation.hooks.optimizeDependencies.tap("ChangeExportsType", () => {
					for (const module of compilation.modules) {
						if (
							module.nameForCondition() ===
								path.join(compiler.context, "target.js") &&
							module.buildMeta
						) {
							module.buildMeta.exportsType =
								currentWatchStep.step === "1"
									? "namespace"
									: currentWatchStep.step === "2"
										? "flagged"
										: undefined;
						}
						if (
							module.nameForCondition() ===
								path.join(compiler.context, "default-target.js") &&
							module.buildMeta
						) {
							module.buildMeta.exportsType = "default";
							module.buildMeta.defaultObject =
								currentWatchStep.step === "0" || currentWatchStep.step === "4"
									? "redirect"
									: "redirect-warn";
						}
					}
				});
			});
		}
	]
}));
