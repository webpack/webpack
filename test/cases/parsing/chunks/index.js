it("should parse a Coffeescript style function expression in require.ensure", function(done) {
	require.ensure([], (function(_this) {
		return function(require) {
			require("./file").should.be.eql("ok");
			done();
		};
	}(this)));
});

it("should parse a bound function expression in require.ensure", function(done) {
	require.ensure([], function(require) {
		require("./file").should.be.eql("ok");
		done();
	}.bind(this));
});

it("should parse a string in require.ensure", function(done) {
	require.ensure("./file", function(require) {
		require("./file").should.be.eql("ok");
		done();
	});
});

it("should parse a string in require.ensure with arrow function expression", function(done) {
	require.ensure("./file", require => {
		require("./file").should.be.eql("ok");
		done();
	});
});


it("should parse a string in require.ensure with arrow function array expression", function(done) {
	require.ensure("./file", require => (require("./file").should.be.eql("ok"), done()));
});



