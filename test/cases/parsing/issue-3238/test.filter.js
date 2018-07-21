var supportsIteratorDestructuring = require("../../../helpers/supportsIteratorDestructuring");

module.exports = function(config) {
	return !config.minimize && supportsIteratorDestructuring();
};
