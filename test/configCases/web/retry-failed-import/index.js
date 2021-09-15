const doImport = () => import(/* webpackChunkName: "the-chunk" */ "./chunk");

it("should be able to retry a failed import()", () => {
	const promise = doImport();

	expect(document.head._children).toHaveLength(1);

	const script = document.head._children[0];
	expect(script.onerror).toBeTypeOf("function");

	script.onerror({ type: "load", target: script });

	return promise.catch(err => {
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("ChunkLoadError");
		expect(err.type).toBe("missing");
		expect(err.request).toBe("https://test.cases/path/the-chunk.js");
		expect(err.message).toMatch(
			/^Loading chunk .+ failed\.\n\(missing: https:\/\/test\.cases\/path\/the-chunk\.js\)$/
		);

		const promise = doImport();

		expect(document.head._children).toHaveLength(1);

		const script = document.head._children[0];
		expect(script.onload).toBeTypeOf("function");

		script.onload();

		return promise.catch(err => {
			expect(err).toBeInstanceOf(Error);
			expect(err.name).toBe("ChunkLoadError");
			expect(err.type).toBe(undefined);
			expect(err.request).toBe(undefined);
			expect(err.message).toMatch(
				/^Loading chunk .+ failed\.\n\(undefined: undefined\)$/
			);

			const promise = doImport();

			expect(document.head._children).toHaveLength(1);

			__non_webpack_require__("./the-chunk.js");
			document.head._children[0].onload();

			return promise.then(module => {
				expect(module).toEqual(nsObj({ default: "ok" }));

				const promise = doImport();

				expect(document.head._children).toHaveLength(0);

				return promise.then(module2 => {
					expect(module2).toBe(module);
				});
			});
		});
	});
});
