const supportsWorker = require("../../../helpers/supportsWorker");
const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

module.exports = () => supportsWorker() && supportsOptionalChaining();
