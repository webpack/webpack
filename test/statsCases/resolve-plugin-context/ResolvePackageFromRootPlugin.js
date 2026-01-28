"use strict";

/** @typedef {import("enhanced-resolve").Resolver} Resolver */
/** @typedef {import("enhanced-resolve").ResolveRequest} ResolveRequest */
/** @typedef {import("enhanced-resolve").ResolveContext} ResolveContext */

/**
 * @template T, R
 * @typedef {import("tapable").AsyncSeriesBailHook<T, R>} AsyncSeriesBailHook
 */

const nestedNodeModuleRegex = /node_modules.*node_modules/;
const replaceNodeModuleRegex = /^.*node_modules(\/|\\)/;

/**
 * Tries to resolve node_modules from root before using the nested version when the version matches.
 *
 * Use cases:
 * - nested node_module structure like prior to npm@3
 * - symlinked node_modules
 *
 * Note: this plugin has a very stupid algorithm to check semver constraints and works only with fixed versions.
 */
module.exports = class ResolvePackageFromRootPlugin {
	/**
	 * @param {string} context context
	 */
	constructor(context) {
		this.rootPath = context;
	}

	/**
	 * @param {Resolver & { hooks: { resolved: AsyncSeriesBailHook<[ResolveRequest & { context: { issuer: string } }, ResolveContext], null | ResolveRequest> } }} resolver resolver
	 */
	apply(resolver) {
		resolver.hooks.resolved.tapAsync("ResolvePackageFromRootPlugin", (originalResolved, _, callback) => {

			if (!nestedNodeModuleRegex.test(
				/** @type {string} */
				(originalResolved.path)
			) || !originalResolved.context || !
				(originalResolved.context).issuer) {
				return callback(null, originalResolved)
			}

			resolver.doResolve(resolver.hooks.resolve, {
				context: {},
				path: originalResolved.context.issuer,
				request: originalResolved.context.issuer
			}, `resolve issuer of ${originalResolved.path}`, {}, (err, issuer) => {
				if (err) {
					return callback(null, originalResolved);
				}

				const moduleRequestPath = /** @type {string} */ (originalResolved.path).replace(replaceNodeModuleRegex, "");

				resolver.doResolve(resolver.hooks.resolve, {
					context: {},
					path: this.rootPath,
					request: moduleRequestPath
				}, `resolve ${moduleRequestPath} in ${this.rootPath}`, {}, (err, _resolvedInParentContext) => {
					if (err) {
						return callback(null, originalResolved);
					}

					const resolvedInParentContext = /** @type {ResolveRequest} */ (_resolvedInParentContext);

					const packageName =
						/** @type {NonNullable<ResolveRequest["descriptionFileData"]>} */
						(resolvedInParentContext.descriptionFileData).name;
					const resolvedVersion =
						/** @type {NonNullable<ResolveRequest["descriptionFileData"]>} */
						(resolvedInParentContext.descriptionFileData).version;
					const wantedVersion =
						/** @type {{ dependencies: Record<string, string> }} */
						(
							/** @type {ResolveRequest} */
							(issuer).descriptionFileData
						).dependencies[
							/** @type {string} */
							(packageName)
						];

					if (resolvedVersion !== wantedVersion) {
						return callback(null, originalResolved);
					}

					return callback(null, resolvedInParentContext);
				});
			});
		})
	}
};
