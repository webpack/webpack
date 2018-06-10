it("should run", function() {
	Promise.all(
		[
			import(/* webpackChunkName: "a" */ "./a"),
			import(/* webpackChunkName: "b" */ "./b"),
			import(/* webpackChunkName: "c" */ "./c")
		]
	);

	const files = require("fs").readdirSync(__dirname);
	const hasFile = files.indexOf('a-b-c.bundle.js') !== -1;

	expect(hasFile).toBe(true);
});
