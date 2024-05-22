const supportsImportAttributes = require("../../../helpers/supportsImportAttributes");

module.exports = () => {
	return supportsImportAttributes() && !/^v(2[2-9])/.test(process.version);
};
