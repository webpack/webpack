var supportsWebAssembly = require("../../../helpers/supportsWebAssembly");
var supportsResponse = require("../../../helpers/supportsResponse");

module.exports = function (config) {
	return supportsWebAssembly() && supportsResponse();
};
