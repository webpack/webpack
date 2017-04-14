import { x, y } from "./b";

it("should pass when required by CommonJS module", function () {
	var test1 = require('./a').default;
	test1().should.be.eql("OK");
});

it("should pass when use babeljs transpiler", function() {
	//the following are generated code by use babeljs.
	// use it this way will save trouble to setup babel-loader
	// the babeljs transpiled code depends on the __esMoudule to be set
	var _test = require('./a');
	var _test2 = _interopRequireDefault(_test);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	var test2 = (0, _test2.default)();
	test2.should.be.eql("OK");
});

it("should double reexport from non-harmony modules correctly", function() {
	y.should.be.eql("y");
	x.should.be.eql("x");
});


import { a, b } from "./reexport"

it("should be possible to reexport a module with unknown exports", function() {
	a.should.be.eql("a");
	b.should.be.eql("b");
});
