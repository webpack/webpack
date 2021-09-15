it("should find all modules", function() {
	return Promise.all([
		import(/* webpackChunkName: "a" */ "./a"), // has 3 modules (1 into x, 1 into y)
		import(/* webpackChunkName: "b" */ "./b"), // has 2 modules (1 into y)
		import(/* webpackChunkName: "c" */ "./c"), // has 2 modules (1 into y)
	])
});
