it("should run module.hot.accept(…)", function() {
	module?.hot?.accept("./a", function() {});
	module?.hot.accept();
});
