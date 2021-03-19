/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	output: {
		chunkFilename: "[name].js",
		globalObject: "typeof self !== 'undefined' ? self : this"
	}
};
