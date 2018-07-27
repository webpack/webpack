/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ModuleGraphConnection = require("./ModuleGraphConnection");

/** @typedef {import("./Dependency")} Dependency */
/** @typedef {import("./Module")} Module */

class ModuleGraph {
	constructor() {
		/** @type {Map<Dependency, ModuleGraphConnection>} */
		this._dependencyMap = new Map();
		/** @type {Map<Module, Set<ModuleGraphConnection>>} */
		this._moduleMap = new Map();
		/** @type {Map<Module, Set<ModuleGraphConnection>>} */
		this._originMap = new Map();
		/** @type {Map<any, Object>} */
		this._metaMap = new Map();
	}

	_getModuleSet(module) {
		let connections = this._moduleMap.get(module);
		if (connections === undefined) {
			connections = new Set();
			this._moduleMap.set(module, connections);
		}
		return connections;
	}

	_getOriginSet(module) {
		let connections = this._originMap.get(module);
		if (connections === undefined) {
			connections = new Set();
			this._originMap.set(module, connections);
		}
		return connections;
	}

	/**
	 * @param {Module} originModule the referencing module
	 * @param {Dependency} dependency the referencing dependency
	 * @param {Module} module the referenced module
	 * @returns {void}}
	 */
	setResolvedModule(originModule, dependency, module) {
		const connection = new ModuleGraphConnection(
			originModule,
			dependency,
			module
		);
		this._dependencyMap.set(dependency, connection);
		const connections = this._getModuleSet(module);
		connections.add(connection);
		const originConnections = this._getOriginSet(originModule);
		originConnections.add(connection);
	}

	/**
	 * @param {Dependency} dependency the referencing dependency
	 * @param {Module} module the referenced module
	 * @returns {void}
	 */
	updateModule(dependency, module) {
		const connection = this._dependencyMap.get(dependency);
		if (connection.module === module) return;
		const oldSet = this._moduleMap.get(connection.module);
		oldSet.delete(connection);
		connection.module = module;
		const newSet = this._moduleMap.get(module);
		newSet.add(connection);
	}

	/**
	 * @param {Dependency} dependency the referencing dependency
	 * @param {string} explanation an explanation
	 * @returns {void}
	 */
	addExplanation(dependency, explanation) {
		const connection = this._dependencyMap.get(dependency);
		connection.addExplanation(explanation);
	}

	/**
	 * @param {Module} oldModule the old referencing module
	 * @param {Module} newModule the new referencing module
	 * @param {function(ModuleGraphConnection): boolean} filterConnection filter predicate for replacement
	 * @returns {void}
	 */
	replaceModule(oldModule, newModule, filterConnection) {
		if (oldModule === newModule) return;
		const oldConnections = this._getOriginSet(oldModule);
		const newConnections = this._getOriginSet(newModule);
		for (const connection of oldConnections) {
			if (filterConnection(connection)) {
				connection.originModule = newModule;
				newConnections.add(connection);
				oldConnections.delete(connection);
			}
		}
		const oldConnections2 = this._getModuleSet(oldModule);
		const newConnections2 = this._getModuleSet(newModule);
		for (const connection of oldConnections2) {
			if (filterConnection(connection)) {
				connection.module = newModule;
				newConnections2.add(connection);
				oldConnections2.delete(connection);
			}
		}
	}

	/**
	 * @param {Module} module the referenced module
	 * @param {string} explanation an explanation why it's referenced
	 * @returns {void}
	 */
	addExtraReason(module, explanation) {
		const connections = this._getModuleSet(module);
		connections.add(new ModuleGraphConnection(null, null, module, explanation));
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referenced module
	 * @returns {Module} the referenced module
	 */
	getResolvedModule(dependency) {
		const connection = this._dependencyMap.get(dependency);
		return connection !== undefined ? connection.resolvedModule : null;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referenced module
	 * @returns {ModuleGraphConnection | undefined} the connection
	 */
	getConnection(dependency) {
		const connection = this._dependencyMap.get(dependency);
		return connection;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referenced module
	 * @returns {Module} the referenced module
	 */
	getModule(dependency) {
		const connection = this._dependencyMap.get(dependency);
		return connection !== undefined ? connection.module : null;
	}

	/**
	 * @param {Dependency} dependency the dependency to look for a referencing module
	 * @returns {Module} the referencing module
	 */
	getOrigin(dependency) {
		const connection = this._dependencyMap.get(dependency);
		return connection !== undefined ? connection.originModule : null;
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleGraphConnection[]} reasons why a module is included
	 */
	getIncomingConnections(module) {
		const connections = this._getModuleSet(module);
		return Array.from(connections);
	}

	/**
	 * @param {Module} module the module
	 * @returns {ModuleGraphConnection[]} list of outgoing connections
	 */
	getOutgoingConnection(module) {
		const connections = this._getOriginSet(module);
		return Array.from(connections);
	}

	/**
	 * @param {any} thing any thing
	 * @returns {Object} metadata
	 */
	getMeta(thing) {
		let meta = this._metaMap.get(thing);
		if (meta === undefined) {
			meta = Object.create(null);
			this._metaMap.set(thing, meta);
		}
		return meta;
	}
}

module.exports = ModuleGraph;
module.exports.ModuleGraphConnection = ModuleGraphConnection;
