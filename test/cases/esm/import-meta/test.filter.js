const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

module.exports = config => !config.module || supportsRequireInModule();
