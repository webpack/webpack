/** @typedef {import("enhanced-resolve").ResolveRequest} ResolveRequest */
/** @typedef {import("../../../../").ExternalItemFunctionData} ExternalItemFunctionData */

/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	externals: [
		({ context: _context, request, getResolve }, callback) => {
			if (request !== "external" && request !== "external-false") {
				return callback(null, false);
			}

			const context = /** @type {string} */ (_context);

			const resolve =
				/** @type {ReturnType<NonNullable<ExternalItemFunctionData["getResolve"]>>} */ (
					/** @type {NonNullable<ExternalItemFunctionData["getResolve"]>} */
					(getResolve)({
						alias: {
							"external-false": false
						}
					})
				);

			if (request === "external-false") {
				resolve(context, request, callback);
			} else {
				resolve(context, request, (err, resolved, resolveRequest) => {
					if (err) {
						callback(err);
					} else if (
						resolved !== /** @type {ResolveRequest} */ (resolveRequest).path
					) {
						callback(new Error("Error"));
					} else {
						callback(null, `var ${JSON.stringify(resolved)}`);
					}
				});
			}
		}
	]
};
