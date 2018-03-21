const customStatsPlugin = require("./customStatsAPIplugin");
module.exports = {
	mode: "production",
	entry: "./index",
	plugins: [new customStatsPlugin()]
};
