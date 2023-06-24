module.exports = {
	findBundle: function (i, options) {
		return i === 0
			? ["./import-style_js.bundle0.js", "bundle0.js"]
			: ["./649.bundle1.js", "bundle1.js"];
	}
};
