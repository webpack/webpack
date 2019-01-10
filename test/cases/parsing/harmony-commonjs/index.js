import { x, y } from "./b";

it("should pass when required by CommonJS module", function () {
	var test1 = require('./a').default;
	expect(test1()).toBe("OK");
});

it("should pass when use babeljs transpiler", function() {
	//the following are generated code by use babeljs.
	// use it this way will save trouble to setup babel-loader
	// the babeljs transpiled code depends on the __esModule to be set
	var _test = require('./a');
	var _test2 = _interopRequireDefault(_test);
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	var test2 = (0, _test2.default)();
	expect(test2).toBe("OK");
});

it("should double reexport from non-harmony modules correctly", function() {
	expect(y).toBe("y");
	expect(x).toBe("x");
});


import { a, b } from "./reexport"

it("should be possible to reexport a module with unknown exports", function() {
	expect(a).toBe("a");
	expect(b).toBe("b");
});
