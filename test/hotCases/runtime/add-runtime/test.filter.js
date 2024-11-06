var supportsWorker = require("../../../helpers/supportsWorker");

module.exports = function (config) {
	if (config.target !== "web") {
		return false;
	}
	return supportsWorker();
};
