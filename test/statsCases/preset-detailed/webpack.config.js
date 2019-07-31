const LogTestPlugin = require("../../helpers/LogTestPlugin");

module.exports = {
	mode: "production",
	entry: "./index",
	stats: "detailed",
	plugins: [new LogTestPlugin()]
};
