var fs = require("fs");

if(!fs.existsSync("./js")) {
	// build the vendor first,
	// since automated integration tests
	// seem to run the webpack config not the build.js
	require("./build");
}

// export both configs,
// though a real config would likely not build vendor every time
module.exports = [
	require("./webpack.vendor.config"),
	require("./webpack.app.config")
];
