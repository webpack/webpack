const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

module.exports = function (config) {
	return !config.minimize && supportsOptionalChaining();
};
