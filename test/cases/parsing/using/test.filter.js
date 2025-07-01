const supportsUsing = require("../../../helpers/supportsUsing");

module.exports = function (config) {
	// TODO https://github.com/terser/terser/issues/1625
	if (config.minimize) {
		return false;
	}

	return supportsUsing();
};
