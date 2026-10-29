import a from "./a";

import.meta.webpackHot.accept("./a", () => Promise.reject());

it("should fail the update when an accept handler's promise rejects without a reason", (done) => {
	expect(a).toBe(1);
	const events = [];
	NEXT((err) => {
		if (err) return done(err);
		import.meta.webpackHot
			.check({
				onErrored(event) {
					events.push(event);
				}
			})
			.then(
				() => done(new Error("The update should fail")),
				(error) => {
					expect(error.message).toBe("Update failed with undefined");
					expect(import.meta.webpackHot.status()).toBe("fail");
					expect(events).toEqual([
						{
							type: "accept-errored",
							moduleId: "./index.js",
							dependencyId: "./a.js",
							error: undefined
						}
					]);
					done();
				}
			)
			.catch(done);
	});
});
