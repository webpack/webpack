/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: {
		entry: "./entry"
	},
	module: {
		parser: {
			javascript: {
				dynamicImportMode: "weak"
			}
		}
	}
};
