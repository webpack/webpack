const supportsWebAssembly = require("../../../helpers/supportsWebAssembly");
const supportsResponse = require("../../../helpers/supportsResponse");

module.exports = () => supportsWebAssembly() && supportsResponse();
