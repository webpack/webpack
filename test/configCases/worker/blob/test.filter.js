const supportsBlob = require("../../../helpers/supportsBlob");
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker() && supportsBlob();
