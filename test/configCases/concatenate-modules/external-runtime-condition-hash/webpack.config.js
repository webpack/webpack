"use strict";

const ConcatenatedModule = require("../../../../lib/optimize/ConcatenatedModule");
const createHash = require("../../../../lib/util/createHash");

/** @typedef {import("../../../../types").Compilation} Compilation */
/** @typedef {import("../../../../types").Module} Module */

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	target: "node",
	externals: { "external-mod": "commonjs fs" },
	optimization: {
		concatenateModules: true,
		minimize: false,
		usedExports: true,
		providedExports: true
	},
	plugins: [
		function apply() {
			/**
			 * @param {Compilation} compilation compilation
			 */
			const handler = (compilation) => {
				compilation.hooks.afterSeal.tap("testcase", () => {
					const concatenated =
						/** @type {ConcatenatedModule | undefined} */
						(
							[...compilation.modules].find(
								(m) => m instanceof ConcatenatedModule
							)
						);
					expect(concatenated).toBeDefined();

					const externalModule = [
						.../** @type {ConcatenatedModule} */ (concatenated)._modules
					].find((m) => m.identifier().startsWith("external "));
					expect(externalModule).toBeDefined();

					const hashWith = (runtimeCondition) => {
						const m =
							/** @type {ConcatenatedModule} */
							(concatenated);
						const original = m._createConcatenationList;
						m._createConcatenationList = () => [
							{
								type: "external",
								module: externalModule,
								runtimeCondition,
								nonDeferAccess: true,
								index: 0,
								name: undefined,
								deferredName: undefined,
								deferred: false,
								deferredNamespaceObjectUsed: false,
								deferredNamespaceObjectName: undefined,
								interopNamespaceObjectUsed: false,
								interopNamespaceObjectName: undefined,
								interopNamespaceObject2Used: false
							}
						];
						try {
							const hash = createHash("xxhash64");
							m.updateHash(hash, {
								chunkGraph: compilation.chunkGraph,
								runtime: m._runtime
							});
							return hash.digest("hex");
						} finally {
							m._createConcatenationList = original;
						}
					};

					const hashA = hashWith("main");
					const hashB = hashWith("other");
					const hashStable = hashWith("main");

					expect(hashA).not.toBe(hashB);
					expect(hashA).toBe(hashStable);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
