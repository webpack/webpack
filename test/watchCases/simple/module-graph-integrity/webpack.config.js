"use strict";

const assert = require("assert");
const path = require("path");
const {
	dependencies: { NullDependency },
	ModuleGraphConnection,
	NormalModule
} = require("../../../..");
const assertModuleGraph = require("../../../helpers/assertModuleGraph");

/** @type {import("../../../..").Configuration} */
module.exports = {
	plugins: [
		(compiler) => {
			compiler.hooks.finishMake.tap(
				"ModuleGraphIntegrityTest",
				(compilation) => {
					const { modules, moduleGraph } = compilation;
					const origin = [...modules].find(
						(module) =>
							module instanceof NormalModule &&
							module.resource === path.join(compiler.context, "index.js")
					);
					assert(origin);
					const outgoing = /** @type {Set<ModuleGraphConnection>} */ (
						moduleGraph.getOutgoingConnections(origin)
					);
					const connection = [...outgoing].find(
						(connection) =>
							connection.module instanceof NormalModule &&
							connection.module.resource ===
								path.join(compiler.context, "value.js")
					);
					assert(connection && connection.dependency);
					const { dependency, module: target } = connection;
					const block = moduleGraph.getParentBlock(dependency);
					assert(block);
					const dependencyIndex = moduleGraph.getParentBlockIndex(dependency);
					const incoming = /** @type {Set<ModuleGraphConnection>} */ (
						moduleGraph.getIncomingConnections(target)
					);
					/**
					 * @param {() => void} change corrupt the graph
					 * @param {() => void} restore restore the graph
					 * @param {string} message expected diagnostic
					 * @returns {void}
					 */
					const check = (change, restore, message) => {
						change();
						try {
							expect(() => assertModuleGraph(compilation)).toThrow(message);
						} finally {
							restore();
						}
					};
					expect(() => assertModuleGraph(compilation)).not.toThrow();
					check(
						() => {
							moduleGraph.setParents(
								dependency,
								block,
								target,
								dependencyIndex
							);
						},
						() => {
							moduleGraph.setParents(
								dependency,
								block,
								origin,
								dependencyIndex
							);
						},
						"incorrect dependency parent"
					);
					check(
						() => {
							moduleGraph.setParents(
								dependency,
								target,
								origin,
								dependencyIndex
							);
						},
						() => {
							moduleGraph.setParents(
								dependency,
								block,
								origin,
								dependencyIndex
							);
						},
						"incorrect dependency block"
					);
					const nestedBlock = origin.blocks[0];
					assert(nestedBlock && nestedBlock.dependencies.length > 0);
					const nestedDependency = nestedBlock.dependencies[0];
					const nestedIndex = moduleGraph.getParentBlockIndex(nestedDependency);
					check(
						() => {
							moduleGraph.setParents(
								nestedDependency,
								origin,
								origin,
								nestedIndex
							);
						},
						() => {
							moduleGraph.setParents(
								nestedDependency,
								nestedBlock,
								origin,
								nestedIndex
							);
						},
						"incorrect dependency block"
					);
					const dependencies = block.dependencies;
					check(
						() => {
							block.dependencies = dependencies.filter(
								(item) => item !== dependency
							);
						},
						() => {
							block.dependencies = dependencies;
						},
						"stale outgoing dependency"
					);
					check(
						() => {
							connection.originModule = target;
						},
						() => {
							connection.originModule = origin;
						},
						"incorrect outgoing origin"
					);
					check(
						() => {
							connection.module = origin;
						},
						() => {
							connection.module = target;
						},
						"incorrect incoming target"
					);
					check(
						() => {
							modules.delete(target);
						},
						() => {
							modules.add(target);
						},
						"missing target"
					);
					check(
						() => {
							modules.delete(origin);
						},
						() => {
							modules.add(origin);
						},
						"missing origin"
					);
					check(
						() => {
							incoming.delete(connection);
						},
						() => {
							incoming.add(connection);
						},
						"missing incoming connection"
					);
					check(
						() => {
							outgoing.delete(connection);
						},
						() => {
							outgoing.add(connection);
						},
						"missing outgoing connection"
					);
					// Plugin connections may have no dependency or dependency parent.
					for (const dependency of [null, new NullDependency()]) {
						const pluginConnection = new ModuleGraphConnection(
							origin,
							dependency,
							target
						);
						outgoing.add(pluginConnection);
						incoming.add(pluginConnection);
						try {
							expect(() => assertModuleGraph(compilation)).not.toThrow();
						} finally {
							outgoing.delete(pluginConnection);
							incoming.delete(pluginConnection);
						}
					}
				}
			);
		}
	]
};
