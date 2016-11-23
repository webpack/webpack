var path = require("path");
module.exports = {
	vendor: require("fs").readFileSync(path.join(__dirname, "vendor.js"), "utf-8"),
	main: require("fs").readFileSync(path.join(__dirname, "main.js"), "utf-8")
};
