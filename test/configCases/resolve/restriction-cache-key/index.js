import results from "./loader!./loader";

it("should distinguish regular expression restrictions", () => {
	expect(results.javascript).toBe("module.js");
	expect(results.json).toBe("module.json");
});

it("should distinguish regular expression flags", () => {
	expect(results.caseSensitive).toBe(false);
	expect(results.caseInsensitive).toBe("module.js");
});

it("should preserve equivalent restrictions and distinguish strings", () => {
	expect(results.equivalent).toBe("module.js");
	expect(results.string).toBe(false);
});

it("should distinguish restrictions nested in byDependency", () => {
	expect(results.nestedJavascript).toBe("module.js");
	expect(results.nestedJson).toBe("module.json");
});
