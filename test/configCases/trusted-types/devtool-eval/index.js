it("should pass TrustedScript to eval", function () {
	var policy = __webpack_require__.tt();
	policy.createScript = jest.fn(script => {
		expect(typeof script).toEqual("string");
		return new TrustedScript(script);
	});

	require("./test.js");
	expect(window.module.exports).toBeInstanceOf(Object);
	expect(window.module.exports.foo).toEqual("bar");

	const testPattern =
		"var test = {\\s*foo: 'bar'\\s*};\\s*module.exports = test;";
	expect(policy.createScript).toBeCalledWith(
		expect.stringMatching(testPattern)
	);
	expect(window.eval).toBeCalledWith(
		expect.objectContaining({
			_script: expect.stringMatching(testPattern)
		})
	);
});

class TrustedScript {
	constructor(script) {
		this._script = script;
	}
}

let globalEval;
beforeEach(done => {
	globalEval = eval;
	window.module = {};
	window.eval = jest.fn(x => {
		expect(x).toBeInstanceOf(TrustedScript);
		return globalEval(x._script);
	});
	done();
});

afterEach(done => {
	delete window.module;
	window.eval = globalEval;
	done();
});
