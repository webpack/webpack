it("Should place externals into its own chunks when externalsType is module", function (done) {
	var fs = require("fs");
	var path = require("path");
	var source = fs.readFileSync(__filename, "utf-8");
	var source2 = fs.readFileSync(
		path.resolve(__dirname, "./async.mjs"),
		"utf-8"
	);

	// external
	expect(source2).toMatch(/import(.*)from\s*["']fs["']\s*/);
	// external2
	expect(source2).toMatch(/import(.*)from\s*["']node:fs["']\s*/);
	// external3
	expect(source).toMatch(/import\(\s*["']fs["']\s*\)/);
	expect(source).not.toMatch(/import(.*)from\s*["']fs["']\s*/);
	expect(source).not.toMatch(/import(.*)from\s*["']node:fs["']\s*/);

	import(/* webpackChunkName: 'async' */ "./chunk").then((ns) => {
		expect(ns.readFileSync).toBe(fs.readFileSync);
		expect(ns.readFile).toBe(fs.readFile);

		import("external3").then((ns) => {
			expect(ns.writeFile).toBe(fs.writeFile);

			done();
		});
	});
});
