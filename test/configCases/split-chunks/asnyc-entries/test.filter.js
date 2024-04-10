// eslint-disable-next-line n/no-unpublished-require
var supportsWorker = require("../../../helpers/supportsWorker");

module.exports = function (config) {
	return supportsWorker();
};
