const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");
const supportsWorker = require("../../../helpers/supportsWorker");

module.exports = () => supportsWorker() && supportsOptionalChaining();
