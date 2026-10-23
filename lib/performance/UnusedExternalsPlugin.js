/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const UnusedExternalsWarning = require("../errors/UnusedExternalsWarning");
const {
	getAlternateCoreModuleRequest
} = require("../externals/ExternalModuleFactoryPlugin");
const isDependencyKind = require("../graph/isDependencyKind");

/**
 * @import {
 * 	Externals,
 * 	PerformanceOptions
 * } from "../../declarations/WebpackOptions"
 */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../graph/Dependency" */
/** @import ModuleGraphConnection from "../graph/ModuleGraphConnection" */

const PLUGIN_NAME = "UnusedExternalsPlugin";

/**
 * Collects the requests the configuration names outright. A RegExp or a function
 * decides per request, so there is no entry that could be called unused.
 * @param {Externals} externals the configured externals
 * @param {Set<string>} requests collected requests
 * @returns {void}
 */
const collectRequests = (externals, requests) => {
	if (typeof externals === "string") {
		requests.add(externals);
	} else if (Array.isArray(externals)) {
		for (const entry of externals) collectRequests(entry, requests);
	} else if (externals instanceof RegExp || typeof externals === "function") {
		// Decides per request, so it names nothing that could be called unused.
	} else if (externals) {
		for (const request of Object.keys(externals)) requests.add(request);
	}
};

/**
 * Removes the configured requests named by a dependency.
 * @param {Dependency | null} dependency the incoming dependency
 * @param {Set<string>} requests the remaining configured requests
 * @returns {boolean} whether the dependency names a module
 */
const consumeDependency = (dependency, requests) => {
	if (!dependency || !isDependencyKind(dependency, "module-dependency")) {
		return false;
	}

	requests.delete(dependency.request);
	if (isDependencyKind(dependency, "context-element")) {
		requests.delete(dependency.originalRequest);
	}

	if (requests.size === 0) return true;
	const alternateRequest = getAlternateCoreModuleRequest(dependency.request);
	if (alternateRequest !== undefined) requests.delete(alternateRequest);
	return true;
};

class UnusedExternalsPlugin {
	/**
	 * Creates an instance of UnusedExternalsPlugin.
	 * @param {PerformanceOptions} options the plugin options
	 */
	constructor(options) {
		/** @type {PerformanceOptions["hints"]} */
		this.hints = options.hints;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		const hints = this.hints;

		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const { externals } = compilation.options;

				if (externals === undefined) return;

				/** @type {Set<string>} */
				const declared = new Set();

				collectRequests(externals, declared);

				if (declared.size === 0) return;
				// Nothing was factorized, so nothing could be made external.
				if (compilation.modules.size === 0) return;

				// A cached userRequest can name a removed alias. Start with one current
				// dependency per external so repeated imports need no full graph walk.
				const { moduleGraph } = compilation;
				/** @type {Iterator<ModuleGraphConnection>[] | undefined} */
				let pendingConnections;
				for (const module of compilation.modules) {
					if (!module.is("external")) continue;

					const incomingConnections =
						moduleGraph.getIncomingConnections(module);
					const connections = incomingConnections[Symbol.iterator]();
					for (
						let connection = connections.next();
						!connection.done;
						connection = connections.next()
					) {
						if (!consumeDependency(connection.value.dependency, declared)) {
							continue;
						}
						if (declared.size === 0) return;
						if (pendingConnections === undefined) {
							pendingConnections = [connections];
						} else {
							pendingConnections.push(connections);
						}
						break;
					}
				}

				// Resume at the next unread connection; the graph stays unchanged
				// throughout this synchronous hook.
				if (pendingConnections !== undefined) {
					for (const connections of pendingConnections) {
						for (
							let connection = connections.next();
							!connection.done;
							connection = connections.next()
						) {
							consumeDependency(connection.value.dependency, declared);
							if (declared.size === 0) return;
						}
					}
				}

				const unused = [...declared].sort();
				const warning = new UnusedExternalsWarning(unused);

				if (hints === "error") {
					compilation.errors.push(warning);
				} else if (hints === "stats") {
					compilation.hints.push(warning);
				} else {
					compilation.warnings.push(warning);
				}
			});
		});
	}
}

module.exports = UnusedExternalsPlugin;
