var supportsWebAssembly = require("../../test/helpers/supportsWebAssembly");

module.exports = function(config) {
	return supportsWebAssembly();
};
