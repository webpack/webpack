module.exports = {
	findBundle: function () {
		return [
			"./runtime/one.mjs",
			"./one.mjs",
			"./runtime/dir2/two.mjs",
			"./dir2/two.mjs",
			"./runtime/three.mjs",
			"./three.mjs",
			"./runtime/dir4/four.mjs",
			"./dir4/four.mjs",
			"./runtime/dir5/dir6/five.mjs",
			"./dir5/dir6/five.mjs",
			"./runtime/dir5/dir6/six.mjs",
			"./dir5/dir6/six.mjs"
		];
	}
};
