// eslint-disable-next-line n/no-unpublished-require
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = function (config) {
	return supportsWorker();
};
