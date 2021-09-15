/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	performance: false,
	stats: {
		modulesSpace: Infinity,
		modulesSort: "!name"
	}
};
