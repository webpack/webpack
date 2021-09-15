/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.(png|svg|jpg)$/,
				type: "asset",
				parser: {
					dataUrlCondition: (source, { filename, module }) => {
						return filename.includes("?foo=bar");
					}
				}
			}
		]
	}
};
