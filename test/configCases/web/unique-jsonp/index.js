it("should do something", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__dirname + "/module.js", "utf-8");
	expect(source).toMatch(
		/^\(\(c\) => Array\.isArray\(c\) \? c : self\["webpackChunksomething"\] = \[\]\)\(self\["webpackChunksomething"\]\)\.push\(/
	);
});

if (Math.random() < 0) import(/* webpackChunkName: "module" */ "./module");
