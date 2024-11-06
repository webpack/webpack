module.exports = {
	findBundle: function () {
		return [
			"./runtime/one.js",
			"./one.js",
			"./runtime/dir2/two.js",
			"./dir2/two.js",
			"./runtime/three.js",
			"./three.js",
			"./runtime/dir4/four.js",
			"./dir4/four.js",
			"./runtime/dir5/dir6/five.js",
			"./dir5/dir6/five.js",
			"./runtime/dir5/dir6/six.js",
			"./dir5/dir6/six.js"
		];
	}
};
