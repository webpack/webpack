it("should do something", () => {
	const fs = require("fs");
	const path = require("path");
	const source = fs.readFileSync(
		path.join(__output_dirname__, "module.js"),
		"utf-8"
	);
	expect(source).toMatch(/^\(self\[\"webpackChunksomething\"\]/);
});

if (Math.random() < 0) import(/* webpackChunkName: "module" */ "./module");
