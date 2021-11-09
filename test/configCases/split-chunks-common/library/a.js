var path = require("path");
module.exports = {
	vendor: require("fs").readFileSync(path.join(__output_dirname__, "vendor.js"), "utf-8"),
	main: require("fs").readFileSync(path.join(__output_dirname__, "main.js"), "utf-8")
};
