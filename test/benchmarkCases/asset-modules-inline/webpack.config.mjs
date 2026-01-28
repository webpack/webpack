/** @type {import("../../../types.d.ts").Configuration} */
export default {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.svg/,
				type: "asset/inline"
			},
			{
				mimetype: "image/svg+xml",
				type: "asset/inline"
			}
		]
	}
};
