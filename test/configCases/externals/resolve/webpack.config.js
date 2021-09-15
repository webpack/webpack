/** @type {import("../../../../").Configuration} */
module.exports = {
	optimization: {
		concatenateModules: true
	},
	externals: [
		async ({ context, request, getResolve }) => {
			if (request !== "external") return false;
			const resolve = getResolve();
			const resolved = await resolve(context, request);
			return `var ${JSON.stringify(resolved)}`;
		}
	]
};
