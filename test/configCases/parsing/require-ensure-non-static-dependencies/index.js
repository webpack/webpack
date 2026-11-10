it("should walk .bind() arguments once for a non-static require.ensure dependency list", () => {
	var name = "a";
	var loaded;
	var load = function () {
		require.ensure([name], function () {}.bind(loaded = require(`./dir/${name}.js`)));
	};
	try {
		load();
	} catch (_err) {
		// `require.ensure` is left unhandled here
	}
	expect(loaded).toBe("a");
});
