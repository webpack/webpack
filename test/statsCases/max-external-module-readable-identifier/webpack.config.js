/** @type {import("../../../types").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	externals: {
		test: "commonjs very-very-very-very-long-external-module-readable-identifier-it-should-be-truncated"
	}
};
