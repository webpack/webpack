/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	cache: {
		type: "memory"
	},
	output: {
		filename: "bundle.js?[contenthash]"
	}
};
