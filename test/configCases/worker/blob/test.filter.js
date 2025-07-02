const supportsWorker = require("../../../helpers/supportsWorker");
const supportsBlob = require("../../../helpers/supportsBlob");

module.exports = () => supportsWorker() && supportsBlob();
