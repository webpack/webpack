it("should fail the check when the update manifest fails to load", (done) => {
	const statuses = [];
	import.meta.webpackHot.addStatusHandler((status) => {
		statuses.push(status);
	});
	import.meta.webpackHot
		.check(true)
		.then(
			() => done(new Error("check() should reject")),
			(err) => {
				expect(err.name).toBe("TypeError");
				expect(statuses).toEqual(["check", "fail"]);
				expect(import.meta.webpackHot.status()).toBe("fail");
				done();
			}
		)
		.catch(done);
});
