/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const UnusedAliasesWarning = require("../errors/UnusedAliasesWarning");
const { join } = require("../util/fs");
const {
	ABSOLUTE_PATH_REGEXP,
	WINDOWS_PATH_SEPARATOR_REGEXP
} = require("../util/identifier");
const matchAlias = require("../util/matchAlias");
const getSourceModules = require("./getSourceModules");

/** @typedef {import("../../declarations/WebpackOptions").PerformanceOptions} PerformanceOptions */
/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Module")} Module */

/**
 * One `resolve.alias` entry, prepared for repeated matching.
 * @typedef {object} PendingAlias
 * @property {string} name the alias name as written, for the report
 * @property {string} matchName the name to compare with, separators normalized when absolute
 * @property {boolean} onlyModule whether the alias only matches the whole request
 * @property {boolean} absolute whether the name is an absolute path
 * @property {string | undefined} wildcardPrefix the part of `matchName` before its single "*", when it has one
 * @property {string} wildcardSuffix the part of `matchName` after that "*"
 */

const PLUGIN_NAME = "UnusedAliasesPlugin";

const SLASH = "/";

/**
 * Whether an alias applies to a request. `AliasPlugin` accepts a single "*" in
 * a name, matching by prefix and suffix instead of by segment.
 * @param {string} request the request, separators normalized when the alias is absolute
 * @param {PendingAlias} alias the alias to test
 * @returns {boolean} true when the alias applies
 */
const aliasApplies = (request, alias) =>
	alias.wildcardPrefix !== undefined
		? request.startsWith(alias.wildcardPrefix) &&
			request.endsWith(alias.wildcardSuffix)
		: matchAlias(request, alias.matchName, alias.onlyModule);

class UnusedAliasesPlugin {
	/**
	 * Creates an instance of UnusedAliasesPlugin.
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

		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				compilation.hooks.afterSeal.tap(PLUGIN_NAME, () => {
					// Nothing was factorized, so no alias could match — an empty build
					// is not evidence that an alias is unused.
					if (compilation.modules.size === 0) return;

					const aliases =
						normalModuleFactory.getResolver("normal").options.alias;

					if (aliases.length === 0) return;

					/** @type {PendingAlias[]} */
					const pending = [];
					let hasAbsoluteName = false;

					for (const { name, onlyModule } of aliases) {
						const absolute = ABSOLUTE_PATH_REGEXP.test(name);
						// An absolute name is compared with paths, whose separator differs
						// per platform
						const matchName = absolute
							? name.replace(WINDOWS_PATH_SEPARATOR_REGEXP, SLASH)
							: name;
						const starIndex = matchName.indexOf("*");
						const wildcardPrefix =
							starIndex !== -1 && !matchName.includes("*", starIndex + 1)
								? matchName.slice(0, starIndex)
								: undefined;

						if (absolute) hasAbsoluteName = true;

						pending.push({
							name,
							matchName,
							onlyModule: Boolean(onlyModule),
							absolute,
							wildcardPrefix,
							wildcardSuffix:
								wildcardPrefix === undefined
									? ""
									: matchName.slice(starIndex + 1)
						});
					}

					/**
					 * Drops every alias the request matches. A resolved path is only
					 * ever seen by an absolute name, so `absoluteOnly` skips the rest —
					 * a wildcard would otherwise match a path the resolver never read.
					 * @param {string} request the request to test
					 * @param {boolean=} absoluteOnly whether to test absolute names only
					 * @returns {void}
					 */
					const consume = (request, absoluteOnly) => {
						/** @type {string | undefined} */
						let normalized;

						for (let i = pending.length - 1; i >= 0; i--) {
							const alias = pending[i];
							let candidate = request;

							if (alias.absolute) {
								if (normalized === undefined) {
									normalized = request.replace(
										WINDOWS_PATH_SEPARATOR_REGEXP,
										SLASH
									);
								}
								candidate = normalized;
							} else if (absoluteOnly) {
								continue;
							}

							if (aliasApplies(candidate, alias)) pending.splice(i, 1);
						}
					};

					for (const module of compilation.modules) {
						if (pending.length === 0) break;

						for (const sourceModule of getSourceModules(module)) {
							const rawRequest =
								/** @type {Module & { rawRequest?: string }} */
								(sourceModule).rawRequest;

							if (typeof rawRequest === "string") consume(rawRequest);
						}
					}

					// An absolute name matches the path the resolver saw: for a relative
					// request that is the issuer's context joined with it, never a `rawRequest`.
					if (pending.length > 0 && hasAbsoluteName) {
						const fs = compiler.inputFileSystem || undefined;

						for (const module of compilation.modules) {
							if (pending.length === 0) break;

							const context = module.context;

							if (context === null) continue;

							/** @type {DependenciesBlock[]} */
							const blocks = [module];

							while (blocks.length > 0) {
								const block =
									/** @type {DependenciesBlock} */
									(blocks.pop());

								for (const dependency of block.dependencies) {
									const request =
										/** @type {Dependency & { request?: string }} */
										(dependency).request;

									if (typeof request !== "string" || !request.startsWith(".")) {
										continue;
									}

									consume(join(fs, context, request), true);
								}

								for (const child of block.blocks) blocks.push(child);
							}
						}
					}

					if (pending.length === 0) return;

					const warning = new UnusedAliasesWarning(
						pending.map((alias) => `'${alias.name}'`).sort()
					);

					if (hints === "error") {
						compilation.errors.push(warning);
					} else if (hints === "stats") {
						compilation.hints.push(warning);
					} else {
						compilation.warnings.push(warning);
					}
				});
			}
		);
	}
}

module.exports = UnusedAliasesPlugin;
