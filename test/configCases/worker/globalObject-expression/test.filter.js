var supportsWorker = require("../../../helpers/supportsWorker");

module.exports = function (config) {
	return supportsWorker();
};
