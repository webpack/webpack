module.exports = function (config) {
	// In node 10 v8 has a bug which inserts an additional micro-tick into async functions
	return !process.version.startsWith("v10.");
};
