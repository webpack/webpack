// AMD Module Format
define("app/amd", ["./commonjs", "./harmony"], function(commonjs1, harmony1) { // anonym is also supported
	// but you can use CommonJs-style requires:
	var commonjs2 = require("./commonjs");
	var harmony2 = require("./harmony");
	// Do something...
	return 456;
});
