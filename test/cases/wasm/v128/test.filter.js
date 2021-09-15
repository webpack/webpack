const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");
const supportsFeature = require("webassembly-feature");

module.exports = function (config) {
	// TODO fails with CompileError: WebAssembly.instantiate(): Compiling function #0 failed: memory instruction with no memory @+24
	return false;
	return supportsWebAssembly() && supportsFeature.simd();
};
