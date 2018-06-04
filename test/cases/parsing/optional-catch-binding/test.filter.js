const supportsOptionalCatchBinding = require("../../../helpers/supportsOptionalCatchBinding");

module.exports = function(config) {
	return supportsOptionalCatchBinding();
};
