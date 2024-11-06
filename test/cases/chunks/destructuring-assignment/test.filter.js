module.exports = function (config) {
	// This test can't run in development mode
	return config.mode !== "development";
};
