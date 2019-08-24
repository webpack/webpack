it("should run", function() {
	Promise.all(
		[
			import(/* webpackChunkName: "a" */ "./a"),
			import(/* webpackChunkName: "b" */ "./b"),
			import(/* webpackChunkName: "c" */ "./c")
		]
	);

	const files = require("fs").readdirSync(__dirname);
	const hasFile = files.includes('a~b~c.bundle.js');

	expect(hasFile).toBe(true);
});
