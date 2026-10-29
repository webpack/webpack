import value from "./value";

module.hot.accept("./value");

it("should answer a check made while the runtime catches up", (done) => {
	// Build two updates and apply none, so import() finds the second build's chunk.
	NEXT(() => {
		NEXT(() => {
			let concurrent;
			const onStatus = (status) => {
				if (status === "check" && !concurrent) {
					concurrent = Promise.resolve().then(() => module.hot.check(true));
				}
			};
			module.hot.addStatusHandler(onStatus);
			import(/* webpackChunkName: "page" */ "./page")
				.then((page) => {
					module.hot.removeStatusHandler(onStatus);
					expect(page.default).toBe(value);
					return concurrent.then((updatedModules) => {
						expect(Array.isArray(updatedModules)).toBe(true);
						done();
					});
				})
				.catch(done);
		});
	});
});
