"use strict";

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

	constructor(context) {
		this.rootPath = context;
	}

	apply(resolver) {
		resolver.hooks.resolved.tapAsync("ResolvePackageFromRootPlugin", (originalResolved, _, callback) => {

			if (!nestedNodeModuleRegex.test(originalResolved.path) || !originalResolved.context || !originalResolved.context.issuer) {
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

				const moduleRequestPath = originalResolved.path.replace(replaceNodeModuleRegex, "");

				resolver.doResolve(resolver.hooks.resolve, {
					context: {},
					path: this.rootPath,
					request: moduleRequestPath
				}, `resolve ${moduleRequestPath} in ${this.rootPath}`, {}, (err, resolvedInParentContext) => {
					if (err) {
						return callback(null, originalResolved);
					}

					const packageName = resolvedInParentContext.descriptionFileData.name;
					const resolvedVersion = resolvedInParentContext.descriptionFileData.version;
					const wantedVersion = issuer.descriptionFileData.dependencies[packageName];

					if (resolvedVersion !== wantedVersion) {
						return callback(null, originalResolved);
					}

					return callback(null, resolvedInParentContext);
				});
			});
		})
	}
};
