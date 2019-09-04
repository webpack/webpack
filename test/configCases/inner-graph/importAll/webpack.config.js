const createTestCases = require("../_helpers/createTestCases");
module.exports = createTestCases({
	nothing: {
		usedExports: [],
		expect: {
			"@angular/core": ["ɵccf", "ɵcrt", "ɵdid", "ɵeld", "ɵted", "ɵvid"],
			"./app.component": ["AppComponent"]
		}
	},
	AppComponentNgFactory: {
		usedExports: ["AppComponentNgFactory"],
		expect: {
			"@angular/core": ["ɵccf", "ɵcrt", "ɵdid", "ɵeld", "ɵted", "ɵvid"],
			"./app.component": ["AppComponent"]
		}
	}
});
