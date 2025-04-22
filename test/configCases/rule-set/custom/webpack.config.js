/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /[ab]\.js$/,
				use(data) {
					return {
						loader: "./loader",
						options: {
							resource: data.resource.replace(/^.*[\\/]/g, ""),
							resourceQuery: data.resourceQuery,
							issuer: data.issuer.replace(/^.*[\\/]/g, "")
						}
					};
				}
			}
		]
	}
};
