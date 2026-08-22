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

/** @import { PerformanceOptions } from "../../declarations/WebpackOptions" */
/** @import Compiler from "../Compiler" */
/** @import Dependency from "../Dependency" */
/** @import DependenciesBlock from "../DependenciesBlock" */
/** @import { ContextDependencyOptions } from "../dependencies/ContextDependency" */
/** @import Module from "../Module" */

/**
 * One `resolve.alias` entry, prepared for repeated matching.
 * @typedef {object} PendingAlias
 * @property {string} name the alias name as written, for the report
 * @property {string} matchName the name to compare with, separators normalized when absolute
 * @property {boolean} onlyModule whether the alias only matches the whole request
 * @property {boolean} absolute whether the name is an absolute path
 * @property {string | undefined} wildcardPrefix the part of `matchName` before its single "*", when it has one
 * @property {string} wildcardSuffix the part of `matchName` after that "*"
 * @property {boolean} used whether some request reached this alias
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

					const configured =
						normalModuleFactory.getResolver("normal").options.alias;

					if (configured.length === 0) return;

					/** @type {PendingAlias[]} */
					const entries = [];
					let hasAbsoluteName = false;
					let unused = configured.length;

					for (const { name, onlyModule } of configured) {
						const absolute = ABSOLUTE_PATH_REGEXP.test(name);
						// An absolute name is compared with paths, whose separator differs
						// per platform
						const matchName = absolute
							? name.replace(WINDOWS_PATH_SEPARATOR_REGEXP, SLASH)
							: name;
						const starIndex = matchName.indexOf("*");
						// `onlyModule` turns the wildcard off, so only the whole name matches
						const wildcardPrefix =
							!onlyModule &&
							starIndex !== -1 &&
							!matchName.includes("*", starIndex + 1)
								? matchName.slice(0, starIndex)
								: undefined;

						if (absolute) hasAbsoluteName = true;

						entries.push({
							name,
							matchName,
							onlyModule: Boolean(onlyModule),
							absolute,
							wildcardPrefix,
							wildcardSuffix:
								wildcardPrefix === undefined
									? ""
									: matchName.slice(starIndex + 1),
							used: false
						});
					}

					/**
					 * Marks the one alias a request reaches: `AliasPlugin` stops at the
					 * first match, and a resolved path is only seen by an absolute name.
					 * @param {string} request the request to test
					 * @param {boolean=} absoluteOnly whether to test absolute names only
					 * @returns {void}
					 */
					const consume = (request, absoluteOnly) => {
						/** @type {string | undefined} */
						let normalized;

						for (let i = 0; i < entries.length; i++) {
							const alias = entries[i];
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

							if (aliasApplies(candidate, alias)) {
								if (!alias.used) {
									alias.used = true;
									unused--;
								}

								return;
							}
						}
					};

					for (const module of compilation.modules) {
						if (unused === 0) break;

						for (const sourceModule of getSourceModules(module)) {
							const rawRequest =
								/** @type {Module & { rawRequest?: string }} */
								(sourceModule).rawRequest;

							if (typeof rawRequest === "string") consume(rawRequest);
						}
					}

					// Only what is left unaccounted for is worth the walk: a request the
					// graph keeps nowhere else is on the dependency that asked for it.
					if (unused > 0) {
						const fs = compiler.inputFileSystem || undefined;
						// One import states its request on several dependencies, and a
						// request every module makes states it once per module.
						/** @type {Set<string>} */
						const seen = new Set();

						for (const module of compilation.modules) {
							if (unused === 0) break;

							const context = module.context;

							/** @type {DependenciesBlock[]} */
							const blocks = [module];

							while (blocks.length > 0) {
								const block =
									/** @type {DependenciesBlock} */
									(blocks.pop());

								for (const dependency of block.dependencies) {
									const typed =
										/** @type {Dependency & { request?: string, options?: ContextDependencyOptions }} */
										(dependency);
									// A `ContextModule` keeps the request in its options, and one
									// an alias sent to `false` reaches no `rawRequest` at all.
									const request =
										typeof typed.request === "string"
											? typed.request
											: typed.options &&
												  typeof typed.options.request === "string"
												? typed.options.request
												: undefined;

									if (request === undefined) continue;

									if (!seen.has(request)) {
										seen.add(request);
										consume(request);
									}

									// An absolute name matches the path the resolver saw, which for
									// a relative request is the issuer's context joined with it, so
									// the same request answers differently per module.
									if (
										hasAbsoluteName &&
										context !== null &&
										request.startsWith(".")
									) {
										consume(join(fs, context, request), true);
									}
								}

								for (const child of block.blocks) blocks.push(child);
							}
						}
					}

					if (unused === 0) return;

					const warning = new UnusedAliasesWarning(
						entries
							.filter((alias) => !alias.used)
							.map((alias) => `'${alias.name}'`)
							.sort()
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
