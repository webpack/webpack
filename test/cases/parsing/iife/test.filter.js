module.exports = function (config) {
	// TODO fails due to minimizer bug: https://github.com/terser/terser/issues/880
	return !config.minimize;
};
