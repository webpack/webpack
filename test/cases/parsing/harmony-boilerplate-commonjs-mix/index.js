import boilerplate from "webpack/__boilerplate__/./boilerplate";

it("should provide CommonJS interfaces even if webpack/__boilerplate__ import exists", function() {
	(function() {
		module.exports = 1;
	}).should.not.throw();
});

it("should strip webpack/__boilerplate__/ prefix when importing", function() {
	boilerplate.should.be.eql(42);
});
