"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	output: {
		filename: "[name].js"
	},
	plugins: [
		/**
		 * @param {import("../../../../").Compiler} compiler compiler
		 */
		(compiler) => {
			const {
				DefinePlugin,
				Dependency,
				ModuleNotFoundError,
				WebpackError,
				container,
				dependencies,
				javascript,
				runtime,
				sharing,
				util
			} = compiler.webpack;
			const sorted = new util.SortableSet([3, 1, 2]);

			sorted.sort();

			new DefinePlugin({
				PUBLIC_API: JSON.stringify({
					range: sharing.semver.rangeToString(
						sharing.semver.parseRange("^1.2.3")
					),
					urlAndGlobal: container.extractUrlAndGlobal(
						"remote@https://example.com/remote.js"
					),
					undoPath: util.getUndoPath("a/b/c.js", "/out", false),
					sorted: [...sorted],
					subset: util.SetHelpers.isSubset(new Set([1, 2]), new Set([1])),
					dependencyIsDependency:
						new dependencies.StaticExportsDependency(["a"], false) instanceof
						Dependency,
					errorIsWebpackError:
						new ModuleNotFoundError(null, new Error("missing"), {
							name: "test"
						}) instanceof WebpackError,
					runtimeModuleIsRuntimeModule:
						runtime.StartupEntrypointRuntimeModule.prototype instanceof
						runtime.RuntimeModule
				})
			}).apply(compiler);

			compiler.hooks.make.tapAsync("PublicApiTest", (compilation, callback) => {
				const dependency = new dependencies.EntryDependency("./other");

				dependency.loc = { name: "other" };
				compilation.addEntry(
					compiler.context,
					dependency,
					{ name: "other" },
					(error) => callback(error)
				);
			});
			compiler.hooks.afterCompile.tap("PublicApiTest", (compilation) => {
				const entrypoint = compilation.entrypoints.get("other");
				const chunks =
					entrypoint && javascript.ChunkHelpers.getAllChunks(entrypoint);

				if (!chunks || chunks.size !== 1) {
					compilation.errors.push(
						new WebpackError('expected the "other" entry in one chunk')
					);
				}
			});
		}
	]
};
