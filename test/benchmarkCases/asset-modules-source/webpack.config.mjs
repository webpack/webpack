/** @type {import("../../../types.d.ts").Configuration} */
export default {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.svg/,
				type: "asset/source"
			}
		]
	}
};
