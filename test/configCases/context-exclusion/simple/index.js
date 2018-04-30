function requireInContext(someVariable) {
	return require(`./some-dir/${someVariable}`);
}

it("should not exclude paths not matching the exclusion pattern", function() {
	requireInContext("file").should.be.eql("thats good");
	requireInContext("check-here/file").should.be.eql("thats good");
	requireInContext("check-here/check-here/file").should.be.eql("thats good");
});

it("should exclude paths/files matching the exclusion pattern", function() {
		(() => requireInContext("dont")).
			should.throw(/Cannot find module ".\/dont"/);

		(() => requireInContext("dont-check-here/file")).
			should.throw(/Cannot find module ".\/dont-check-here\/file"/);

		(() => requireInContext("check-here/dont-check-here/file")).
			should.throw(/Cannot find module ".\/check-here\/dont-check-here\/file"/);
});
