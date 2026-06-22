var path = require("path");

exports.pitch = function pitch(rem, prev, data) {
	this.loaders[this.loaderIndex + 2].request = path.resolve(
		__dirname,
		"identity-loader.js"
	);
	this.resource = path.resolve(__dirname, "resource.bin");
	this.loaderIndex += 2;
	this.cacheable(false);
};
