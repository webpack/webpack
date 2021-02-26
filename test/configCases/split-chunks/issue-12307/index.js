it("should not split the shared-modules into a separate chunk", () => {
	const shared = __STATS__.modules.find(m => m.name.includes("shared-module"));
	expect(shared.chunks).toEqual(["a", "shared-module_js"]);
});
