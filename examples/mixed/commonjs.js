// CommonJs Module Format
module.exports = 123;

// but you can use amd.style requires
require(
	["./amd"],
	function(amd1) {
		var amd2 = require("./amd");
	}
);