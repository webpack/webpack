module.exports = {
	output: {
		filename: "[name].js",
		globalObject: "typeof self !== 'undefined' ? self : this"
	},
	target: "web"
};
