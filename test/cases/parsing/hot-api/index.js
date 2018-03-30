if(module.hot) {
	it("should run module.hot.accept(…)", function() {
		module.hot.accept("./a", function() {});
	});
	it("should run module.hot.accept()", function() {
		module.hot.accept();
	});
	it("should run module.hot.decline", function() {
		module.hot.decline("./b");
	});
} else {
	it("should run module.hot.* (disabled)", function() {
	});
}
