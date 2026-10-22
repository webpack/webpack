"use strict";

const assert = require("assert");

/** @import { AsyncDependenciesBlock, Compilation, Dependency, Module, ModuleGraphConnection } from "../../" */

/**
 * Checks the graph before seal can redirect connections or concatenate modules.
 * @param {Compilation} compilation compilation to check
 * @returns {void}
 */
const assertModuleGraph = (compilation) => {
	const { modules, moduleGraph } = compilation;
	/** @type {Set<ModuleGraphConnection>} */
	const incomingConnections = new Set();
	/** @type {Set<ModuleGraphConnection>} */
	const outgoingConnections = new Set();
	for (const module of modules) {
		const identifier = module.identifier();
		/** @type {Set<Dependency>} */
		const dependencies = new Set();
		/** @type {(Module | AsyncDependenciesBlock)[]} */
		const blocks = [module];
		for (const block of blocks) {
			for (const dependency of block.dependencies) {
				dependencies.add(dependency);
				assert(
					moduleGraph.getParentModule(dependency) === module,
					`${identifier}: incorrect dependency parent`
				);
				assert(
					moduleGraph.getParentBlock(dependency) === block,
					`${identifier}: incorrect dependency block`
				);
			}
			blocks.push(...block.blocks);
		}
		for (const connection of moduleGraph.getOutgoingConnections(module)) {
			outgoingConnections.add(connection);
			assert(
				connection.originModule === module,
				`${identifier}: incorrect outgoing origin`
			);
			// Plugin-created connections need not belong to a dependency block.
			if (
				connection.dependency &&
				moduleGraph.getParentModule(connection.dependency) === module
			) {
				assert(
					dependencies.has(connection.dependency),
					`${identifier}: stale outgoing dependency`
				);
			}
			if (connection.module) {
				assert(modules.has(connection.module), `${identifier}: missing target`);
			}
		}
		for (const connection of moduleGraph.getIncomingConnections(module)) {
			incomingConnections.add(connection);
			assert(
				connection.module === module,
				`${identifier}: incorrect incoming target`
			);
			if (connection.originModule) {
				assert(
					modules.has(connection.originModule),
					`${identifier}: missing origin`
				);
			}
		}
	}
	for (const connection of outgoingConnections) {
		if (connection.module) {
			assert(
				incomingConnections.has(connection),
				`${connection.module.identifier()}: missing incoming connection`
			);
		}
	}
	for (const connection of incomingConnections) {
		if (connection.originModule) {
			assert(
				outgoingConnections.has(connection),
				`${connection.originModule.identifier()}: missing outgoing connection`
			);
		}
	}
};

module.exports = assertModuleGraph;
