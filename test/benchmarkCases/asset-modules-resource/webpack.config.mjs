/** @type {import("../../../types.d.ts").Configuration} */
export default {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.svg/,
				type: "asset/resource"
			},
			{
				mimetype: "image/svg+xml",
				type: "asset/resource"
			}
		]
	}
};
