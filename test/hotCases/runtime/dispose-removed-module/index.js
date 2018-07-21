var m = require("./module");

it("should dispose a module which is removed from bundle", function(done) {
	var disposed = [];
	m.setHandler(function(id) {
		disposed.push(id);
	});
	NEXT(require("../../update")(done, true, function() {
		require("./module");
		NEXT(require("../../update")(done, true, function() {
			var newModule = require("./module");
			disposed.should.be.eql([newModule.default]);
			done();
		}));
	}));
});

if(module.hot) {
	module.hot.accept("./module");
}
