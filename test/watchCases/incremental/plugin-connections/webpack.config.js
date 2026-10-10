"use strict";

/** @type {import("../../../..").Configuration[]} */
module.exports = ["development", "production"].map((mode, index) => ({
	mode: /** @type {"development" | "production"} */ (mode),
	devtool: false,
	cache: { type: index === 0 ? "memory" : "filesystem" },
	output: { clean: false, pathinfo: false, filename: `bundle${index}.js` },
	optimization: { minimize: false, moduleIds: "named", chunkIds: "named" },
	plugins: [
		(compiler) => {
			compiler.hooks.finishMake.tap(
				{ name: "PluginConnection", stage: -1 },
				(compilation) => {
					for (const module of compilation.modules) {
						const dependency =
							new compiler.webpack.dependencies.ModuleDependency(
								module.identifier()
							);
						dependency.weak = true;
						compilation.moduleGraph.setResolvedModule(
							module,
							dependency,
							module
						);
						expect(
							compilation.moduleGraph.getParentModule(dependency)
						).toBeUndefined();
					}
				}
			);
		}
	]
}));
