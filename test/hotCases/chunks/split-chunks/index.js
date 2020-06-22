import vendor from "vendor";
import.meta.hot.accept("vendor");
it("should hot update a splitted initial chunk using import.meta.hot.* API", function (done) {
	expect(vendor).toBe("1");
	NEXT(
		require("../../update")(done, true, () => {
			expect(vendor).toBe("2");
			done();
		})
	);
});

it("should hot update a splitted initial chunk using module.hot.* API", function (done) {
	expect(vendor).toBe("2");
	module.hot.accept("vendor");
	NEXT(
		require("../../update")(done, true, () => {
			expect(vendor).toBe("3");
			done();
		})
	);
});
