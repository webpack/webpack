// `module` is never read here, so nothing but the module cache asks for `__webpack_require__`
var main = require.main;

it("should find the entry through require.main in a single-module bundle", function () {
	expect(typeof main).toBe("object");
	expect(main.exports).toBe(exports);
});
