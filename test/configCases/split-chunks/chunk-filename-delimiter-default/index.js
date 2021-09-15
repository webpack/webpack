it("should run", function () {
	const files = require("fs").readdirSync(__dirname);
	expect(files).toContain("a.bundle.js");
	expect(files).toContain("b-b_js-c441f481.bundle.js");

	return Promise.all([
		import(/* webpackChunkName: "a" */ "./a"),
		import(/* webpackChunkName: "b" */ "./b")
	]);
});
