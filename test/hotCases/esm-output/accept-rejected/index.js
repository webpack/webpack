import a from "./a";

import.meta.webpackHot.accept("./a", () => Promise.reject(new Error("Rejected accept")));

it("should fail the update when an accept handler's promise rejects", (done) => {
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
					expect(error.message).toBe("Rejected accept");
					expect(import.meta.webpackHot.status()).toBe("fail");
					expect(events).toEqual([
						{
							type: "accept-errored",
							moduleId: "./index.js",
							dependencyId: "./a.js",
							error
						}
					]);
					done();
				}
			)
			.catch(done);
	});
});
