const path = require("path");
module.exports = function() {
	this.callback(null, "module.exports = 'ok';", {
		version: 3,
		file: "/should/be/removed",
		sourceRoot: path.join(__dirname, "folder"),
		sources: ["/test2.txt"],
		sourcesContent: ["Test"],
		mappings: "AAAA"
	});
};
