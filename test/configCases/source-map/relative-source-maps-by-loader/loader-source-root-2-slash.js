const path = require("path");
/** @type {import("../../../../").LoaderDefinition} */
module.exports = function () {
	this.callback(null, "module.exports = 'ok';", {
		version: 3,
		file: "/should/be/removed",
		sourceRoot: path.join(__dirname, "folder") + "/",
		sources: ["/test4.txt"],
		sourcesContent: ["Test"],
		names: [],
		mappings: "AAAA"
	});
};
