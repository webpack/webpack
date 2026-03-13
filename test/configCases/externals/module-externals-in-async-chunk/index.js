it("Should place externals into its own chunks when externalsType is module", function (done) {
	var fs = require("fs");

	expect(__webpack_modules__["external"]).toBeUndefined();
	expect(__webpack_modules__["external2"]).toBeUndefined();
	expect(__webpack_modules__["external3"]).toBeDefined();

	import(/* webpackChunkName: 'async' */ "./chunk").then((ns) => {
		expect(__webpack_modules__["external"]).toBeDefined();
		expect(__webpack_modules__["external2"]).toBeDefined();
		expect(ns.readFileSync).toBe(fs.readFileSync);
		expect(ns.readFile).toBe(fs.readFile);

		import("external3").then((ns) => {
			expect(ns.writeFile).toBe(fs.writeFile);

			done();
		});
	});
});
