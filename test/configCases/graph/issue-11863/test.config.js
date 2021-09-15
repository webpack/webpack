module.exports = {
	findBundle: function (i, options) {
		return [
			"shared.js",
			"a.js",
			"b.js",
			"c.js",
			"ab.js",
			"ac.js",
			"bc.js",
			"abc.js"
		];
	}
};
