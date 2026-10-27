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
/** @import ContextElementDependency from "../dependencies/context/ContextElementDependency" */
/** @import ModuleDependency from "../dependencies/core/ModuleDependency" */
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
 * Removes the configured requests named by the dependencies of unread incoming connections.
 * @param {Iterator<ModuleGraphConnection>} connections the unread incoming connections of an external
 * @param {Set<string>} requests the remaining configured requests
 * @param {boolean} checkAlternates whether a core module's other spelling can be configured
 * @param {boolean} firstOnly whether to stop after the first dependency naming a module
 * @returns {boolean} whether a dependency named a module
 */
const consumeConnections = (
	connections,
	requests,
	checkAlternates,
	firstOnly
) => {
	/** @type {EXPECTED_FUNCTION | undefined} */
	let previousConstructor;
	let isModuleDependency = false;
	let isContextElement = false;
	/** @type {string | undefined} */
	let previousRequest;
	for (
		let connection = connections.next();
		!connection.done;
		connection = connections.next()
	) {
		const { dependency } = connection.value;
		if (dependency === null) continue;
		// The kind is per class, and incoming dependencies mostly share one class.
		if (dependency.constructor !== previousConstructor) {
			previousConstructor = dependency.constructor;
			isModuleDependency = isDependencyKind(dependency, "module-dependency");
			isContextElement =
				isModuleDependency && isDependencyKind(dependency, "context-element");
			previousRequest = undefined;
		}
		if (!isModuleDependency) continue;

		const { request } = /** @type {ModuleDependency} */ (dependency);
		if (isContextElement) {
			requests.delete(
				/** @type {ContextElementDependency} */ (dependency).originalRequest
			);
		} else if (request === previousRequest) {
			continue;
		}
		previousRequest = request;
		requests.delete(request);
		if (checkAlternates) {
			const alternateRequest = getAlternateCoreModuleRequest(request);
			if (alternateRequest !== undefined) requests.delete(alternateRequest);
		}
		if (firstOnly || requests.size === 0) return true;
	}
	return false;
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
				let checkAlternates = false;
				for (const request of declared) {
					if (getAlternateCoreModuleRequest(request) !== undefined) {
						checkAlternates = true;
						break;
					}
				}
				/** @type {Iterator<ModuleGraphConnection>[] | undefined} */
				let pendingConnections;
				for (const module of compilation.modules) {
					if (!module.is("external")) continue;

					const incomingConnections =
						moduleGraph.getIncomingConnections(module);
					const connections = incomingConnections[Symbol.iterator]();
					if (
						consumeConnections(connections, declared, checkAlternates, true)
					) {
						if (declared.size === 0) return;
						if (pendingConnections === undefined) {
							pendingConnections = [connections];
						} else {
							pendingConnections.push(connections);
						}
					}
				}

				// Resume at the next unread connection; the graph stays unchanged
				// throughout this synchronous hook.
				if (pendingConnections !== undefined) {
					for (const connections of pendingConnections) {
						consumeConnections(connections, declared, checkAlternates, false);
						if (declared.size === 0) return;
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
