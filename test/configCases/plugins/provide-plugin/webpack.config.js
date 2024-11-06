var ProvidePlugin = require("../../../../").ProvidePlugin;
/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new ProvidePlugin({
			aaa: "./aaa",
			"bbb.ccc": "./bbbccc",
			dddeeefff: ["./ddd", "eee", "3-f"],
			aa1: ["./a", "c", "cube"],
			es2015_aUsed: ["./harmony2", "aUsed"],
			"process.env.NODE_ENV": "./env",
			es2015: "./harmony",
			es2015_name: ["./harmony", "default"],
			es2015_alias: ["./harmony", "alias"],
			es2015_year: ["./harmony", "year"],
			"this.aaa": "./aaa",
			esm: "./esm.js"
		})
	]
};
