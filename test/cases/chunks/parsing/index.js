var should = require("should");

it("should handle bound function expressions", function(done) {
	require.ensure([], function(require) {
		this.should.be.eql({ test: true })
		require("./empty?test");
		process.nextTick.should.have.type("function"); // check if injection still works
		require.ensure([], function(require) {
			this.should.be.eql({ test: true })
			done();
		}.bind(this));
	}.bind({test: true}));
});

it("should handle require.ensure without function expression", function(done) {
	function f() {
		done();
	}
	require.ensure([], f);
});

it("should parse expression in require.ensure, which isn't a function expression", function(done) {
	require.ensure([], (function() {
		require("./empty?require.ensure:test").should.be.eql({});
		return function f() {
			done();
		}
	}()));
});

it("should accept a require.include call", function() {
	require.include("./require.include");
	var value = null;
	require.ensure([], function(require) {
		value = require("./require.include");
	});
	should.strictEqual(value, "require.include");
	value.should.be.eql("require.include");
});
