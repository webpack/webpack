/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				dependency: "url",
				type: "asset"
			}
		]
	}
};
