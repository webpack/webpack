var supportsDefaultArgs = require("../../../helpers/supportsDefaultArgs");

module.exports = function(config) {
	return !config.minimize && supportsDefaultArgs();
};
