import value from "./file";

module.hot.accept("./file");

const asyncNext = () => {
	return new Promise((resolve, reject) => {
		NEXT((err, stats) => {
			if(err) return reject(err);
			resolve(stats);
		});
	});
}

it("should download the missing update chunk on import", () => {
	expect(value).toBe(1);
	return asyncNext().then(() => {
		return module.hot.check().then(() => {
			return import("./chunk").then(chunk => {
				expect(value).toBe(1);
				expect(chunk.default).toBe(10);
				return module.hot.apply().then(() => {
					expect(value).toBe(2);
					expect(chunk.default).toBe(20);
				});
			});
		});
	});
});
