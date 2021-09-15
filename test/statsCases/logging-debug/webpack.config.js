const LogTestPlugin = require("../../helpers/LogTestPlugin");

/** @type {import("../../../").Configuration} */
module.exports = {
	mode: "production",
	entry: "./index",
	performance: false,
	module: {
		rules: [
			{
				test: /index\.js$/,
				use: require.resolve("../logging/node_modules/custom-loader")
			}
		]
	},
	plugins: [new LogTestPlugin(true)],
	stats: {
		colors: true,
		logging: false,
		loggingDebug: /custom-loader/
	}
};
