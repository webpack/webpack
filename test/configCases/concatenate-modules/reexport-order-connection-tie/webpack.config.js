"use strict";

const ConcatenatedModule = require("../../../../lib/optimize/ConcatenatedModule");

/** @import { Compilation, Module, ModuleGraph } from "../../../../types" */

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	output: { library: { type: "commonjs2" } },
	optimization: {
		concatenateModules: true,
		sideEffects: true,
		minimize: false
	},
	plugins: [
		function apply() {
			/** @param {Compilation} compilation compilation */
			const handler = (compilation) => {
				compilation.hooks.afterSeal.tap("testcase", () => {
					const concatenated =
						/** @type {EXPECTED_ANY} */
						(
							[...compilation.modules].find(
								(m) => m instanceof ConcatenatedModule
							)
						);
					expect(concatenated).toBeDefined();
					const moduleGraph = compilation.moduleGraph;

					/**
					 * @param {boolean} reverse reverse outgoing connections
					 * @returns {string[]} concatenated module identifiers in order
					 */
					const order = (reverse) => {
						const graph = Object.create(moduleGraph);
						/**
						 * @param {Module} module module
						 * @returns {EXPECTED_ANY[]} outgoing connections
						 */
						graph.getOutgoingConnections = (module) => {
							const connections = [
								...moduleGraph.getOutgoingConnections(module)
							];
							return reverse ? connections.reverse() : connections;
						};
						return [
							...concatenated._createConcatenationList(
								concatenated.rootModule,
								concatenated._modules,
								concatenated._runtime,
								/** @type {ModuleGraph} */ (graph)
							)
						].map((info) => info.module.identifier());
					};

					const forward = order(false);
					expect(forward.some((id) => id.endsWith("a.js"))).toBe(true);
					expect(order(true)).toEqual(forward);
				});
			};
			this.hooks.compilation.tap("testcase", handler);
		}
	]
};
