it("has no 'exports' free var", function () {
	(typeof exports).should.equal("undefined");
});

it("has no 'module' free var", function () {
	(typeof module).should.equal("undefined");
});

it("should throw when accessing 'module.exports'", function () {
	(function () { module.exports; }).should.throw();
});

// skipped as they require TDZ support to implement
// TODO: have an option to enable TDZ (requires 'let' implementation in engine)
it("throws on access to 'exports'", function () {
	this.skip(); return;
	(function () { return exports; }).should.throw(ReferenceError)
});

it("throws on access to 'module'", function () {
	this.skip(); return;
	(function () { module.exports; }).should.throw(ReferenceError)
});

export function foo () {};
export default null;
