module.exports = {
	findBundle: function () {
		return [
			"./runtime.js",
			"./one.js",
			"./dir2/two.js",
			"./three.js",
			"./dir4/four.js",
			"./dir5/dir6/five.js",
			"./dir5/dir6/six.js"
		];
	}
};
