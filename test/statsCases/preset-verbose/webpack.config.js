const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	profile: true,
	stats: "verbose",
	infrastructureLogging: {
		level: "verbose"
	},
	plugins: [new LogTestPlugin()]
};
