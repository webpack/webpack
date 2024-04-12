it("should have warnings for environment not support async/await when using asyncModule", () => {
	return import("./reexport").then(({ number, getNumber, importRequest, moduleRequest, promiseRequest }) => {
		expect(number).toBe(1);
		expect(getNumber()).toBe(42);
		expect(importRequest).toBe("import.js");
		expect(moduleRequest).toBe("module.js");
		expect(promiseRequest).toBe("promise.js");
	});
});
