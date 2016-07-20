// CommonJs-style requires
var commonjs1 = require("./commonjs");
var amd1 = require("./amd");
var labeled1 = require("./labeled");
var harmony1 = require("./harmony");

// AMD-style requires (with all webpack features)
require([
	"./commonjs", "./amd", "./labeled",
	"../require.context/templates/"+amd1+".js",
	Math.random() < 0.5 ? "./commonjs" : "./amd"],
	function(commonjs2, amd2, labeled2, template, randModule) {
		// Do something with it...
	}
);

// labeled modules requires
require: "./labeled";
// with the require label you are only allowed to import labeled modules
// the module needs static information about exports