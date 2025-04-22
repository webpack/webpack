const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");
const supportsResponse = require("../../../helpers/supportsResponse");

module.exports = function (config) {
	return supportsWebAssembly() && supportsResponse();
};
