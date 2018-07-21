it("should dispose a chunk which is removed from bundle", function(done) {
	var m1 = require("./module");
	NEXT(require("../../update")(done, true, function() {
		var m2 = require("./module");
		NEXT(require("../../update")(done, true, function() {
			var m3 = require("./module");
			Promise.all([m1.default, m2.default, m3.default]).then(function(arr) {
				arr[0].should.be.not.eql(arr[2]);
				done();
			});
		}));
	}));
});

if(module.hot) {
	module.hot.accept("./module");
}
