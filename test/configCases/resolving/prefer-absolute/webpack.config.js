/** @typedef {import("enhanced-resolve").Resolver} Resolver */
/** @typedef {import("enhanced-resolve").ResolveRequest} ResolveRequest */
/** @typedef {import("enhanced-resolve").ResolveContext} ResolveContext */

/**
 * @template T, R
 * @typedef {import("tapable").SyncBailHook<T, R>} SyncBailHook
 */

/** @type {import("../../../../").Configuration} */

module.exports = {
	resolve: {
		preferAbsolute: true,
		plugins: [
			{
				/**
				 * @param {Resolver & { hooks: { file: SyncBailHook<[ResolveRequest, ResolveContext], void> } }} resolver resolver
				 */
				apply(resolver) {
					resolver.hooks.file.tap("Test", request => {
						if (
							/test.configCases.*test.configCases/.test(
								/** @type {string} */
								(request.path)
							)
						) {
							throw new Error("Trying to resolve as root path");
						}
					});
				}
			}
		]
	}
};
