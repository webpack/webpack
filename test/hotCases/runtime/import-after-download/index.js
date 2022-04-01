import value from "./file";

module.hot.accept("./file");

const asyncNext = () => {
	return new Promise((resolve, reject) => {
		NEXT((err, stats) => {
			if (err) return reject(err);
			resolve(stats);
		});
	});
};

it("should download the missing update chunk on import", () => {
	expect(value).toBe(1);
	return asyncNext().then(() => {
		return module.hot.check().then(() => {
			return Promise.all([
				import("./chunk"),
				import("./unaffected-chunk")
			]).then(([chunk, unaffectedChunk]) => {
				expect(value).toBe(1);
				expect(chunk.default).toBe(10);
				expect(unaffectedChunk.default).toBe(10);
				return module.hot.apply().then(() => {
					expect(value).toBe(2);
					expect(chunk.default).toBe(20);
					expect(unaffectedChunk.default).toBe(10);
				});
			});
		});
	});
});
