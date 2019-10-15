var supportsWebAssembly = require("../../helpers/supportsWebAssembly");

module.exports = function(config) {
	return supportsWebAssembly();
};
