// `require`ing an ESM module reads `__esModule`, which is what emits
// `__webpack_require__.r`.
const ns = require("./esm");

it("should mark the namespace without relying on Symbol", () => {
	expect(ns.__esModule).toBe(true);
	expect(ns.value).toBe(1);
	expect(ns.default).toBe(2);
});
