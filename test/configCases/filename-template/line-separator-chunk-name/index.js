// ES5 source: the test parses every emitted script as ES5

it("should load chunks whose names hold U+2028 and U+2029", function () {
	var name = "x";
	return Promise.all([
		import(/* webpackChunkName: "a\u2028b" */ "./value"),
		import(
			/* webpackChunkName: "c\u2029d", webpackPrefetch: true */ "./value?other"
		),
		import(/* webpackChunkName: "e\u2028[request]" */ "./ctx/" + name + ".js")
	]).then(function (modules) {
		expect(modules[0].default).toBe(42);
		expect(modules[1].default).toBe(42);
		expect(modules[2].default).toBe("x");
	});
});

it("should keep the characters in the chunk names, ids and files", function () {
	var chunks = __STATS__.children[__STATS_I__].chunks;
	var chunk = chunks.filter(function (chunk) {
		return chunk.names.indexOf("a\u2028b") !== -1;
	})[0];
	expect(chunk.id).toBe("a\u2028b");
	expect(
		chunk.files.some(function (file) {
			return file.indexOf("a\u2028b") !== -1;
		})
	).toBe(true);
});

it("should keep the characters in the entry name", function () {
	expect(__webpack_chunkname__).toBe("main\u2029entry");
});
