import asset from "./unused.png?asset";
import bytes from "./unused.png?bytes";
import inlined from "./unused.png?inline";
import source from "./unused.png?source";
import resource from "./used.png";

it("should not include unused assets", () => {
	expect(resource).toMatch(/\.png/);

	expect(__webpack_modules__["./used.png"]).toBeDefined();
	expect(__webpack_modules__["./unused.png?asset"]).not.toBeDefined();
	expect(__webpack_modules__["./unused.png?bytes"]).not.toBeDefined();
	expect(__webpack_modules__["./unused.png?inline"]).not.toBeDefined();
	expect(__webpack_modules__["./unused.png?source"]).not.toBeDefined();
});
