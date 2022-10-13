it("should allow to get the exposed modules by the container", async () => {
	const container = __non_webpack_require__("./container.js");
	expect(typeof container.getExposedModules).toBe("function");
	const exposedModules = container.getExposedModules();
	expect(exposedModules).toEqual(["./moduleA", "./moduleB"]);
});
