"use strict";

const path = require("path");

const DEPENDENCY = path.join(__dirname, "before-loaders.txt");

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: {
		threads: {
			max: 1
		}
	},
	plugins: [
		{
			apply(compiler) {
				const { NormalModule } = compiler.webpack;

				compiler.hooks.compilation.tap("test", (compilation) => {
					NormalModule.getCompilationHooks(compilation).beforeLoaders.tap(
						"test",
						(loaders, module, loaderContext) => {
							if (path.basename(module.resource) !== "value.js") return;
							loaderContext.addDependency(DEPENDENCY);
						}
					);
					compilation.hooks.succeedModule.tap("test", (module) => {
						if (!module.identifier().endsWith("value.js")) return;
						if (module.buildInfo === undefined) return;
						const dependencies = module.buildInfo.fileDependencies;
						// A cached module restores no dependency set here.
						if (dependencies === undefined) return;
						if (!dependencies.has(DEPENDENCY)) {
							throw new Error(
								"dependency was not merged from the main context"
							);
						}
					});
				});
			}
		}
	],
	module: {
		rules: [
			{
				test: /value\.js$/,
				threads: true
			}
		]
	}
};
