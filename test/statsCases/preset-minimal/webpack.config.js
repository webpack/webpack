const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	stats: "minimal",
	infrastructureLogging: {
		level: "warn"
	},
	plugins: [new LogTestPlugin()]
};
