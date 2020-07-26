const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

/**
 * @param {import("../../../../").Configuration} config
 * @returns {boolean}
 */
module.exports = function (config) {
	if (config.mode === "production") return false;
	if (config.optimization && config.optimization.minimizer) return false;

	return supportsOptionalChaining();
};
