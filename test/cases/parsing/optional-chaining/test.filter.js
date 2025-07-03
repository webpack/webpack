const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

module.exports = config => !config.minimize && supportsOptionalChaining();
