const path = require("path");

module.exports = function (source) {
	this.resource = `${path.resolve(__dirname, "./resource.bin")}?foo=bar#hash`;

	return source + "-simple";
};
