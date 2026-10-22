import { value } from "./module.js";

// what the source holds at `finishModules` is asserted by the config
it("should serve each module's text after releasing the other form", () => {
	expect(value).toBe("module");
});
