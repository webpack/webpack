it("should parse a Coffeescript style function expression in require.ensure", function(done) {
	require.ensure([], (function(_this) {
		return function(require) {
			expect(require("./file")).toEqual("ok");
			done();
		};
	}(this)));
});

it("should parse a bound function expression in require.ensure", function(done) {
	require.ensure([], function(require) {
		expect(require("./file")).toEqual("ok");
		done();
	}.bind(this));
});

it("should parse a string in require.ensure", function(done) {
	require.ensure("./file", function(require) {
		expect(require("./file")).toEqual("ok");
		done();
	});
});

it("should parse a string in require.ensure with arrow function expression", function(done) {
	require.ensure("./file", require => {
		expect(require("./file")).toEqual("ok");
		done();
	});
});


it("should parse a string in require.ensure with arrow function array expression", function(done) {
	require.ensure("./file", require => expect((require("./file")).toEqual("ok"), done()));
});



