var ProvidePlugin = require("../../../../lib/ProvidePlugin");
module.exports = {
	plugins: [
		new ProvidePlugin({
			aaa: "./aaa",
			"bbb.ccc": "./bbbccc",
			"process.env.NODE_ENV": "./env",
		})
	]
};
