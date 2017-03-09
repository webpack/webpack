var ProvidePlugin = require("../../../../lib/ProvidePlugin");
module.exports = {
	plugins: [
		new ProvidePlugin({
			aaa: "./aaa",
			"bbb.ccc": "./bbbccc",
			dddeeefff: ["./ddd", "eee", "3-f"],
			"process.env.NODE_ENV": "./env",
		}, {
			exclude: /ggg/
		}),
		new ProvidePlugin({
			"bbb.ccc": "./bbbccc"
		}, {
			test: [ /ggg/ ]
		})
	]
};
