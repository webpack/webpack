/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: true,
	output: {
		chunkFilename: "[contenthash].js"
	}
};
