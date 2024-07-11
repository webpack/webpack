module.exports = {
	findBundle: function () {
		return [
			"./runtime.mjs",
			"./one.mjs",
			"./dir2/two.mjs",
			"./three.mjs",
			"./dir4/four.mjs",
			"./dir5/dir6/five.mjs",
			"./dir5/dir6/six.mjs"
		];
	}
};
