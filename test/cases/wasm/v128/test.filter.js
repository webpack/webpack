const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");
const supportsFeature = require("webassembly-feature");

module.exports = function(config) {
	return supportsWebAssembly() && supportsFeature.simd();
};
