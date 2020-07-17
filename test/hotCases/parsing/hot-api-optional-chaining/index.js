it("should run module.hot.accept(…)", function() {
	module?.hot?.accept("./a", function() {});
});

it("should skip rest members", function() {
	module?.hot.accept();
});
