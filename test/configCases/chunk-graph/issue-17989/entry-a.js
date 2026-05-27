import loadModule from "./shared";

it("should not have a.add from entry-a + entry-b", () => {
	return loadModule().then((module) => {
		const { arg } = module;
		expect(arg).toBe(42);
	});
});
