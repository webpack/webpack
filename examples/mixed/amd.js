// AMD Module Format
define(
	"app/amd",
	["./commonjs"],
	function(commonjs1) {
		// but you can use CommonJs-style requires:
		var commonjs2 = require("./commonjs");
		// Do something...
		return 456;
	}
);