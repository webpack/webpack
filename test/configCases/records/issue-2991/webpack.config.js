var path = require("path");

module.exports = {
	entry: "./test",
	recordsOutputPath: path.resolve(
		__dirname,
		"../../../js/config/records/issue-2991/records.json"
	),
	target: "node",
	node: {
		__dirname: false
	},
	resolve: {
		aliasFields: ["browser"],
		alias: {
			pkgs: path.resolve(__dirname, "pkgs")
		}
	}
};
