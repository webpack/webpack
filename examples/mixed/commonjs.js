// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
require(
	["./amd", "./labeled"],
	function(amd1, labeled1) {
		var amd2 = require("./amd");
		var labeled2 = require("./labeled");
	}
);