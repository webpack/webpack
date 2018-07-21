var ProvidePlugin = require("../../../../lib/ProvidePlugin");
module.exports = {
	plugins: [
		new ProvidePlugin({
			aaa: "./aaa",
			"bbb.ccc": "./bbbccc",
			"dddeeefff": ["./ddd", "eee", "3-f"],
			"process.env.NODE_ENV": "./env",
			es2015: "./harmony",
			es2015_name: ["./harmony", "default"],
			es2015_alias: ["./harmony", "alias"],
			es2015_year: ["./harmony", "year"],
		})
	]
};
