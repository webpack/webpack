import { resource } from "./module";

it("should not include unused assets", () => {
	expect(resource).toMatch(/\.png/);

	expect(__webpack_modules__["./used.png"]).toBeDefined();
	expect(__webpack_modules__["./unused.png?asset"]).not.toBeDefined();
	expect(__webpack_modules__["./unused.png?bytes"]).not.toBeDefined();
	expect(__webpack_modules__["./unused.png?inline"]).not.toBeDefined();
	expect(__webpack_modules__["./unused.png?source"]).not.toBeDefined();
});
