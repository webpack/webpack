// CommonJs Module Format
module.exports = 123;

// but you can use amd style requires
require(
	["./amd", "./labeled", "./harmony"],
	function(amd1, labeled1, harmony) {
		var amd2 = require("./amd");
		var labeled2 = require("./labeled");
		var harmony2 = require("./harmony");
	}
);