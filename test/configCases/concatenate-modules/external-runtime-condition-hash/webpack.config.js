"use strict";

const ConcatenatedModule = require("../../../../lib/optimize/ConcatenatedModule");
const createHash = require("../../../../lib/util/createHash");

/** @typedef {import("../../../../types").Compilation} Compilation */

/**
 * UMD externals can't be concatenated (see
 * `ExternalModule#getConcatenationBailoutReason`), so they appear as
 * "external" infos in the concat list — that's the code path
 * `ConcatenatedModule#updateHash` needs to incorporate `runtimeCondition`
 * for.
 * @type {import("../../../../types").Configuration}
 */
module.exports = {
	mode: "production",
	target: "node",
	output: { library: { type: "umd" } },
	externals: { "external-mod": "fs" },
	externalsType: "umd",
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		providedExports: true
	},
	plugins: [
		function apply() {
			/** @param {Compilation} compilation compilation */
			const handler = (compilation) => {
				compilation.hooks.afterSeal.tap("testcase", () => {
					const concatenated =
						/** @type {ConcatenatedModule} */
						(
							[...compilation.modules].find(
								(m) => m instanceof ConcatenatedModule
							)
						);
					expect(concatenated).toBeDefined();

					const baseList = [
						...concatenated._createConcatenationList(
							concatenated.rootModule,
							concatenated._modules,
							concatenated._runtime,
							compilation.chunkGraph.moduleGraph
						)
					];
					const externalInfo = baseList.find(
						(info) => info.type === "external"
					);
					expect(externalInfo).toBeDefined();

					const hashWith = (overrideRuntimeCondition) => {
						const original = concatenated._createConcatenationList;
						concatenated._createConcatenationList = () =>
							baseList.map((info) =>
								info === externalInfo
									? { ...info, runtimeCondition: overrideRuntimeCondition }
									: info
							);
						try {
							const hash = createHash("xxhash64");
							concatenated.updateHash(hash, {
								chunkGraph: compilation.chunkGraph,
								runtime: concatenated._runtime
							});
							return hash.digest("hex");
						} finally {
							concatenated._createConcatenationList = original;
						}
					};

					const hashMain = hashWith("main");
					const hashOther = hashWith("other");
					const hashMainAgain = hashWith("main");

					expect(hashMain).not.toBe(hashOther);
					expect(hashMain).toBe(hashMainAgain);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
