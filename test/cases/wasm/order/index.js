it("should be evaluated in the correct order", () => {
	return import("./a").then(({ default: results }) => {
		return Promise.resolve().then(() => {
			// wait an extra tick to get the tick from the tracker
			expect(results).toEqual(["b", "c", "tick", "wasm42", "a"]);
		});
	});
});
