module.exports = {
	findBundle: function (i, options) {
		switch (i) {
			case 0:
				return ["test.js", "0/runtime~app.js"];
			case 1:
				return ["test.js", "1/app.js", "1/runtime~app.js"];
			case 2:
				return ["test.js", "2/app.js", "2/runtime~app.js"];
			case 3:
				return [
					"test.js",
					"3/entry1.js",
					"3/entry2.js",
					"3/runtime~entry1.js",
					"3/runtime~entry2.js"
				];
			case 4:
				return ["test.js", "4/runtime~app.js"];
			case 5:
				return ["test.js", "5/app.js", "5/runtime~app.js"];
			case 6:
				return ["test.js", "6/app.js", "6/runtime~app.js"];
			case 7:
				return [
					"test.js",
					"7/entry1.js",
					"7/entry2.js",
					"7/runtime~entry1.js",
					"7/runtime~entry2.js"
				];
			default:
				break;
		}
	}
};
