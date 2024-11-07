var supportsWebAssembly = require("../../../helpers/supportsWebAssembly");

module.exports = function (config) {
	const [major] = process.versions.node.split(".").map(Number);

	return major >= 18 && supportsWebAssembly();
};
