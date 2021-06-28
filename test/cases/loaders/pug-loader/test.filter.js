const supportsRequireInModule = require("../../../helpers/supportsRequireInModule");

module.exports = config => {
	return !config.module || supportsRequireInModule();
};
