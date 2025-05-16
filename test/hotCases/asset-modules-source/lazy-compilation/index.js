const getFile = name =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

it("should work", async function (done) {
	let promise = import("./file.text");
	NEXT(
		require("../../update")(done, true, () => {
			promise.then(() => {
				expect(getFile("./assets/file.text")).toContain("A");
				module.hot.accept("./file.text", () => {
					expect(getFile("./assets/file.text")).toContain("B");
					done();
				});
				NEXT(require("../../update")(done));
			});
		})
	);
});
