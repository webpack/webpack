/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const ExternalModule = require("../ExternalModule");
const {
	getAlternateCoreModuleRequest
} = require("../ExternalModuleFactoryPlugin");
const UnusedExternalsWarning = require("../errors/UnusedExternalsWarning");

/**
 * @import {
 * 	Externals,
 * 	PerformanceOptions
 * } from "../../declarations/WebpackOptions"
 */
/** @import Compiler from "../Compiler" */

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

				for (const module of compilation.modules) {
					if (module instanceof ExternalModule) {
						// The request as written, not what it was rewritten to.
						declared.delete(module.userRequest);

						// A core module is external under either spelling, so the entry
						// that matched may be the one the request does not use.
						const alternateRequest = getAlternateCoreModuleRequest(
							module.userRequest
						);

						if (alternateRequest !== undefined) {
							declared.delete(alternateRequest);
						}
					}
				}

				if (declared.size === 0) return;

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
