/** @type {import("../../..").Configuration} */
export default {
	entry: "./index",
	module: {
		rules: [
			{
				test: /\.svg/,
				type: "asset",
				parser: {
					dataUrlCondition: {
						maxSize: 8192
					}
				}
			}
		]
	}
};
