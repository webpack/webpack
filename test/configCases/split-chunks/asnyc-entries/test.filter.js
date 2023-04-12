// eslint-disable-next-line node/no-unpublished-require
var supportsWorker = require("../../../helpers/supportsWorker");

module.exports = function (config) {
	return supportsWorker();
};
