/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	externals: {
		test: "commonjs test"
	}
};
