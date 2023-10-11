const getConfig = concatenateModules => ({
	mode: "production",
	optimization: {
		concatenateModules
	}
});

module.exports = [getConfig(false), getConfig(true)];
