it("should have warnings for environment not support async/await when using asyncModule", () => {
	globalThis.scriptGlobal = "script.js";
	return import("./reexport").then(({ number, getNumber, importRequest, moduleRequest, promiseRequest, scriptRequest }) => {
		expect(number).toBe(1);
		expect(getNumber()).toBe(42);
		expect(importRequest).toBe("import.js");
		expect(moduleRequest).toBe("module.js");
		expect(promiseRequest).toBe("promise.js");
		expect(scriptRequest).toBe("script.js");
	});
});
