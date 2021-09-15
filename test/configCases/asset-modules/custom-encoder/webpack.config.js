/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "asset/inline",
				generator: {
					dataUrl: {
						mimetype: "mimetype/png"
					}
				}
			},
			{
				test: /\.jpg$/,
				type: "asset/inline",
				generator: {
					dataUrl() {
						return "data:image/jpg;base64,custom-content";
					}
				}
			},
			{
				test: /\.svg$/,
				type: "asset",
				generator: {
					dataUrl: {
						encoding: false
					}
				}
			}
		]
	}
};
