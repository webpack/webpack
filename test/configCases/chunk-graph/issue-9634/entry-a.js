import leaf from "./leaf";

it("should include the leaf module", () => {
	expect(leaf).toBe("ok");
});

it("should load the leaf module from a", () => {
	return import(/* webpackChunkName: "shared" */ "./shared").then(shared => {
		return shared.default.then(module => {
			expect(module.default).toBe("ok");
		});
	});
});
