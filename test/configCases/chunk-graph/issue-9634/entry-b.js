it("should load the leaf module from b", () => {
	return import(/* webpackChunkName: "async-b2" */ "./async-b2").then(asy => {
		return asy.default.then(asy => {
			return asy.default.then(shared => {
				return shared.default.then(module => {
					expect(module.default).toBe("ok");
				});
			});
		});
	});
});
