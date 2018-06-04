const supportsOptionalCatchBinding = require("../../../helpers/supportsOptionalCatchBinding");

module.exports = function(config) {
	// XXX: Disable this test if UglifyJS is used because it does not support ES 2019
	if (config.mode === "production") {
		return false;
	}
	return supportsOptionalCatchBinding();
};
