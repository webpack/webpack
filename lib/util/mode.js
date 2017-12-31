module.exports = function isProductionLikeMode(options) {
	return options.mode === "production" || options.mode === "defaultedProduction";
};
