import { main, url } from "./module.mjs";

it("should handle a bare import.meta in a scope-hoisted strict harmony module", () => {
	expect(typeof url).toBe("string");
	expect(url.endsWith("module.mjs")).toBe(true);
	expect(main).toBe(false);
});
