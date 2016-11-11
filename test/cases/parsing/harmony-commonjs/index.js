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
})
