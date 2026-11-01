import { a } from "./pure";

it("should keep the module while its export is used", () => {
	expect(a).toBe(1);
	expect("./pure.js" in __webpack_modules__).toBe(true);
});
