var fs = require("fs");
var execSync = require("child_process").execSync;

if(!fs.existsSync("./js")) {
	// build the vendor first,
	// since automated integration tests
	// seem to run the webpack config not the build.js
	execSync("node ./bin/webpack.js --config examples/dll-app-and-vendor/webpack.vendor.config.js");
}

// export both configs,
// though a real config would likely not build vendor every time
module.exports = [
	require("./webpack.vendor.config"),
	require("./webpack.app.config")
];
