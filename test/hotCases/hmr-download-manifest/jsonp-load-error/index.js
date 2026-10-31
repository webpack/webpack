it("should fail the check when the update manifest fails to load", (done) => {
	const statuses = [];
	module.hot.addStatusHandler((status) => {
		statuses.push(status);
	});
	module.hot
		.check(true)
		.then(
			() => done(new Error("check() should reject")),
			(err) => {
				expect(err.name).toBe("TypeError");
				expect(statuses).toEqual(["check", "fail"]);
				expect(module.hot.status()).toBe("fail");
				done();
			}
		)
		.catch(done);
});
