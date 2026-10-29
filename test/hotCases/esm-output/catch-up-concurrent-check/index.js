import value from "./value";

import.meta.webpackHot.accept("./value");

it("should answer a check made while the runtime catches up", (done) => {
	// Build two updates and apply none, so import() finds the second build's chunk.
	NEXT(() => {
		NEXT(() => {
			let concurrent;
			const onStatus = (status) => {
				if (status === "check" && !concurrent) {
					concurrent = Promise.resolve().then(() => import.meta.webpackHot.check(true));
				}
			};
			import.meta.webpackHot.addStatusHandler(onStatus);
			import(/* webpackChunkName: "page" */ "./page")
				.then((page) => {
					import.meta.webpackHot.removeStatusHandler(onStatus);
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
