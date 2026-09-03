"use strict";

/** @typedef {import("enhanced-resolve").Resolver} Resolver */

class RedirectResolverPlugin {
	/**
	 * @param {Resolver} resolver resolver
	 */
	apply(resolver) {
		const target = resolver.ensureHook("resolve");
		resolver
			.getHook("resolve")
			.tapAsync(
				"RedirectResolverPlugin",
				(request, resolveContext, callback) => {
					if (request.request !== "./a.js") return callback();
					resolver.doResolve(
						target,
						{ ...request, request: "./a-alt.js" },
						"redirect ./a.js",
						resolveContext,
						callback
					);
				}
			);
	}
}

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				// a plugin instance has no serializer; it must not keep the module out of the persistent cache
				test: /index\.js$/,
				resolve: {
					plugins: [new RedirectResolverPlugin()]
				}
			}
		]
	}
};
