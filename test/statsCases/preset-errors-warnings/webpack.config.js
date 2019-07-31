const LogTestPlugin = require("../../helpers/LogTestPlugin");

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "errors-warnings",
	plugins: [new LogTestPlugin()]
};
