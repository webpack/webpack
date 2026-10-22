"use strict";

const PLUGIN_NAME = "PackageAlternativePlugin";
const ALTERNATIVE = "package/a.js";

/** @type {import("../../../../").Configuration} */
module.exports = {
	externalsType: "commonjs",
	externals: [
		({ request, originalRequest }, callback) => {
			if (request !== ALTERNATIVE) return callback();
			// only a `./` request is relative to the context the user wrote
			if (originalRequest !== ALTERNATIVE) {
				return callback(
					new Error(
						`Expected "${ALTERNATIVE}" as original request, but got "${originalRequest}"`
					)
				);
			}
			callback(null, true);
		}
	],
	plugins: [
		(compiler) => {
			compiler.hooks.contextModuleFactory.tap(PLUGIN_NAME, (factory) => {
				factory.hooks.alternativeRequests.tap(PLUGIN_NAME, (items) =>
					items.map(({ context }) => ({ context, request: ALTERNATIVE }))
				);
			});
		}
	]
};
