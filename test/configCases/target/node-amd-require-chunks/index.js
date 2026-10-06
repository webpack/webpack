/**
 * @param {number} id suffix of the file to load
 * @param {(result: unknown) => void} callback receives its exports
 */
const loadChunk = (id, callback) => {
	require(["./file" + id], callback);
};

it("should load what an AMD require with an expression asks for", (done) => {
	loadChunk(456, (chunk) => {
		expect(chunk).toBe(123);
		loadChunk(567, (chunk) => {
			expect(chunk).toEqual({ a: 1 });
			done();
		});
	});
});

it("should leave node built-ins to node", () => {
	expect(require("fs")).toBe(__non_webpack_require__("fs"));
});

it("should split the context into chunks unless they are limited to one", () => {
	const { chunks } = __STATS__.children[__STATS_I__];
	if (__STATS_I__ === 0) {
		expect(chunks.length).toBeGreaterThan(1);
	} else {
		expect(chunks).toHaveLength(1);
	}
});
