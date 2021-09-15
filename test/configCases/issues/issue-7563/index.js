it("should compile without error", function() {
	return import(/* webpackChunkName: "one" */ "./one");
});
