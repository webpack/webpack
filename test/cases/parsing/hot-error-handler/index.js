if(module.hot) {
	it("should parse a self accept with error handler", function() {
		module.hot.accept(function(err) {
		
		});
	});
}