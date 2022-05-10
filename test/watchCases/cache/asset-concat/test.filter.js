module.exports = function (config) {
	return !(config.experiments && config.experiments.cacheUnaffected);
};
