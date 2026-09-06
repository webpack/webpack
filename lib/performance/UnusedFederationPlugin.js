/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const RemoteModule = require("../container/RemoteModule");
const { getDeclaredRemotes } = require("../container/declaredRemotes");
const UnusedFederationWarning = require("../errors/UnusedFederationWarning");
const ConsumeSharedModule = require("../sharing/ConsumeSharedModule");
const { getDeclaredShared } = require("../sharing/declaredShared");
const { compareStrings } = require("../util/comparators");

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import { UnusedFederationDetails } from "../errors/UnusedFederationWarning" */

const PLUGIN_NAME = "UnusedFederationPlugin";

/**
 * @param {Set<string>} used the share keys modules were created for
 * @param {string} shareKey the declared share key
 * @returns {boolean} whether anything under the share key was used
 */
const someUsedStartsWith = (used, shareKey) => {
	for (const usedKey of used) {
		if (usedKey.startsWith(shareKey)) return true;
	}

	return false;
};

/**
 * Applies the rule `ContainerReferencePlugin` factorizes by, so that a remote
 * name holding slashes is told apart from an exposed path holding them too.
 * @param {string} request the request a remote module was created for
 * @param {string} name the declared remote name
 * @returns {boolean} whether the request names this remote
 */
const isRequestFor = (request, name) =>
	request.startsWith(name) &&
	(request.length === name.length || request[name.length] === "/");

class UnusedFederationPlugin {
	/**
	 * Creates an instance of UnusedFederationPlugin.
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
			// Reported past the hash, which folds every message into it, so a hint
			// pushed earlier would change the build's identity.
			compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
				const declaredShared = getDeclaredShared(compilation);
				const declaredRemotes = getDeclaredRemotes(compilation);

				if (declaredShared === undefined && declaredRemotes === undefined) {
					return;
				}

				// Nothing was factorized, so no shared or remote module could exist.
				if (compilation.modules.size === 0) return;

				/** @type {Set<string>} */
				const usedShared = new Set();
				/** @type {Set<string>} */
				const remoteRequests = new Set();

				for (const module of compilation.modules) {
					if (module instanceof ConsumeSharedModule) {
						usedShared.add(module.options.shareKey);
					} else if (module instanceof RemoteModule) {
						remoteRequests.add(module.request);
					}
				}

				/** @type {UnusedFederationDetails[]} */
				const unused = [];

				if (declaredShared !== undefined) {
					// Matched on the share key, since that is what the module carries,
					// but reported by the config key, which is what the config spells.
					for (const { name, shareKey, prefix } of declaredShared) {
						const used = prefix
							? someUsedStartsWith(usedShared, shareKey)
							: usedShared.has(shareKey);

						if (!used) unused.push({ name, kind: "shared" });
					}
				}

				if (declaredRemotes !== undefined) {
					/** @type {Set<string>} */
					const usedRemotes = new Set();

					// Declaration order is precedence: `factorize` takes the first
					// name a request matches, so a later one it also matches is dead.
					for (const request of remoteRequests) {
						for (const name of declaredRemotes) {
							if (isRequestFor(request, name)) {
								usedRemotes.add(name);
								break;
							}
						}
					}

					for (const name of declaredRemotes) {
						if (!usedRemotes.has(name)) unused.push({ name, kind: "remote" });
					}
				}

				if (unused.length === 0) return;

				// Ties break by name: declaration order is not worth preserving here.
				unused.sort(
					(a, b) =>
						compareStrings(a.kind, b.kind) || compareStrings(a.name, b.name)
				);

				const warning = new UnusedFederationWarning(unused);

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

module.exports = UnusedFederationPlugin;
