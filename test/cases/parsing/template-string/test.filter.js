var supportsTemplateStrings = require("../../../helpers/supportsTemplateStrings");

module.exports = function(config) {
	return !config.minimize && supportsTemplateStrings();
};
