const supportsWorker = require("../../../helpers/supportsWorker");
const supportsBlob = require("../../../helpers/supportsBlob");

module.exports = function (config) {
	return supportsWorker() && supportsBlob();
};
