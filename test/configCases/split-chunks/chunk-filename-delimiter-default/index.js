it("should run", function () {
	const files = require("fs").readdirSync(__dirname);
	expect(files).toContain("a.bundle.js");
	expect(files).toContain("b-b_js-4dcd382f.bundle.js");

	return Promise.all([
		import(/* webpackChunkName: "a" */ "./a"),
		import(/* webpackChunkName: "b" */ "./b")
	]);
});
