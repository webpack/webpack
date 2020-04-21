/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: {
		orphanModules: true,
		nestedModules: true,
		usedExports: true,
		reasons: true
	}
};
