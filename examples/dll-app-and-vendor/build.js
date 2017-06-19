var execSync = require("child_process").execSync;

// build the vendor first
execSync("node ../../bin/webpack.js --config webpack.vendor.config.js");

// then build both, along with the readme template
global.NO_TARGET_ARGS = true;
require("../build-common");
