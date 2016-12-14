
it("should parse template strings in require.ensure requires", function(done) {
	var name = "abc";
	var suffix = "Test";

	require.ensure([], function(require) {
		var imports = [
			require(`./abc/${name}Test`),
			require(`./abc/${name}Test`),
			require(`./${name}/${name}Test`),
			require(`./abc/${name}${suffix}`),
			require(String.raw`./${name}/${name}${suffix}`)
		];

		for (var i = 0; i < imports.length; i++) {
			imports[i].default.should.eql("ok");
		}
		done()
	})
})

it("should parse template strings in sync requires", function() {
	var name = "sync";
	var suffix = "Test";

	var imports = [
		require(`./sync/${name}Test`),
		require(`./sync/${name}${suffix}`),
		require(String.raw`./sync/${name.slice(0, 1)}y${name.slice(2)}${suffix}`),
		require(`./sync/sync${"Test"}`),
		require(String.raw`./sync/${"sync"}Test`)
	];

	for (var i = 0; i < imports.length; i++) {
		imports[i].default.should.eql("sync");
	}
})

it("should parse template strings in require.resolve", function() {
	var name = "sync";

	// Arbitrary assertion; can't use .ok() as it could be 0,
	// can't use typeof as that depends on webpack config.
	require.resolve(`./sync/${name}Test`).should.not.be.undefined;
})
