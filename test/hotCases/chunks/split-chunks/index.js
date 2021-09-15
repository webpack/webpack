import vendor from "vendor";
module.hot.accept("vendor");
it("should hot update a splitted initial chunk", function (done) {
	expect(vendor).toBe("1");
	NEXT(
		require("../../update")(done, true, () => {
			expect(vendor).toBe("2");
			done();
		})
	);
});
