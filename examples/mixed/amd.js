// AMD Module Format
define(
	"app/amd", // anonym is also supported
	["./commonjs", "./labeled"],
	function(commonjs1, labeled1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		var labeled2 = require("./labeled");
		// Do something...
		return 456;
	}
);