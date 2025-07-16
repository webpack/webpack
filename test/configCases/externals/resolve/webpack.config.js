"use strict";

/** @typedef {import("../../../../").ExternalItemFunctionData} ExternalItemFunctionData */
/** @typedef {import("../../../../").ExternalItemFunctionPromise} ExternalItemFunctionPromise */
/** @typedef {import("../../../../").ExternalItemFunctionDataGetResolve} ExternalItemFunctionDataGetResolve */
/** @typedef {import("../../../../").ExternalItemFunctionDataGetResolveResult} ExternalItemFunctionDataGetResolveResult */

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	externals: [
		/** @type {ExternalItemFunctionPromise} */
		async ({ context, request, getResolve }) => {
			if (request !== "external" && request !== "external-promise") {
				return false;
			}

			const resolve =
				/** @type {ExternalItemFunctionDataGetResolveResult} */
				(
					/** @type {ExternalItemFunctionDataGetResolve} */
					(getResolve)()
				);
			const resolved = await resolve(/** @type {string} */ (context), request);
			return `var ${JSON.stringify(resolved)}`;
		}
	]
};
