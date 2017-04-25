// build both first
var build = require("./test.js");
build((arg) => console.log(arg), require("../../"));

// build again now that both have been build, for readme
// this will be improved when common build is refactored
global.NO_TARGET_ARGS = true;
require("../build-common");
