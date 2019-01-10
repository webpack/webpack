var supportsES6 = require("../../../helpers/supportsES6");

module.exports = function(config) {
	return !config.minimize && supportsES6();
};
