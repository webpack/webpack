/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /\.js$/,
				parser: {
					requireJs: true
				}
			}
		]
	}
};
