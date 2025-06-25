const WarnStrictModeModulesPlugin = require("../../../../lib/WarnStrictModeModulesPlugin");

/** @type {import("../../../../types").Configuration} */
module.exports = {
	mode: "production",
	plugins: [new WarnStrictModeModulesPlugin()]
};
