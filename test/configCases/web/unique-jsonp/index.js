it("should do something", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__dirname + "/module.js", "utf-8");
	expect(source).toMatch(/^\(Array\.isArray\(self\[\"webpackChunksomething\"\]\)/);
});

if (Math.random() < 0) import(/* webpackChunkName: "module" */ "./module");
