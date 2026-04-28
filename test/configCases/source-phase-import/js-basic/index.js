import source staticReflection from "./module.js";

it("should bind a Module reflection for static `import source` of a JS module", () => {
	expect(typeof staticReflection).toBe("object");
	expect(staticReflection).not.toBeNull();
	expect(Object.prototype.toString.call(staticReflection)).toBe("[object Module]");
});

it("should resolve a Module reflection for dynamic `import.source` of a JS module", async () => {
	const reflection = await import.source("./module.js");
	expect(typeof reflection).toBe("object");
	expect(reflection).not.toBeNull();
	expect(Object.prototype.toString.call(reflection)).toBe("[object Module]");
});

it("should return identical reflections for the same source-imported module", async () => {
	const dynamicReflection = await import.source("./module.js");
	expect(dynamicReflection).toBe(staticReflection);
});
