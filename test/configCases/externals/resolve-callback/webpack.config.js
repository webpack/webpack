/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	externals: [
		({ context, request, getResolve }, callback) => {
			if (request !== "external" && request !== "external-false") {
				return callback(null, false);
			}

			const resolve = getResolve({
				alias: {
					"external-false": false
				}
			});

			if (request === "external-false") {
				resolve(context, request, callback);
			} else {
				resolve(context, request, (err, resolved) => {
					if (err) callback(err);
					else callback(null, `var ${JSON.stringify(resolved)}`);
				});
			}
		}
	]
};
