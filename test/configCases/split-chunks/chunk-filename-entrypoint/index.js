it("should run", function() {
	Promise.all(
		[
			import(/* webpackChunkName: "a" */ "./a"),
			import(/* webpackChunkName: "b" */ "./b"),
			import(/* webpackChunkName: "c" */ "./c")
		]
	);

	const files = require("fs").readdirSync(__dirname);
	expect(files).toContain('main.js');
	expect(files).toContain('a-a_js-2a91f0ff.bundle.js');
	expect(files).toContain('b-b_js-c441f481.bundle.js');
});
