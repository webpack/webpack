module.exports = {
	findBundle: function (i, options) {
		return i === 0
			? ["./use-style_js.bundle0.js", "bundle0.js"]
			: ["./226.bundle1.js", "bundle1.js"];
	}
};
