const path = require("path");
module.exports = function() {
	this.callback(null, "module.exports = 'ok';", {
		version: 3,
		file: "/should/be/removed",
		sources: [path.join(__dirname, "folder", "test5.txt")],
		sourcesContent: ["Test"],
		mappings: "AAAA"
	});
};
