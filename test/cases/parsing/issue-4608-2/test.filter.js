var supportsForOf = require("../../../helpers/supportsForOf");

module.exports = function(config) {
	return !config.minimize && supportsForOf();
};
