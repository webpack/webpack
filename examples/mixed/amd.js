// AMD Module Format
define(
	"app/amd", // anonym is also supported
	["./commonjs", "./labeled", "./harmony"],
	function(commonjs1, labeled1, harmony1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		var labeled2 = require("./labeled");
		var harmony2 = require("./harmony");
		// Do something...
		return 456;
	}
);