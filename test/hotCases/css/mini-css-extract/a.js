import "./a.css";

const readStyles = () =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, "main.css"),
		"utf-8"
	);

it("should apply a hot update to the extracted stylesheet", function (done) {
	expect(readStyles()).toContain("color: red;");

	NEXT(
		require("../../update")(done, true, () => {
			expect(readStyles()).toContain("color: blue;");

			done();
		})
	);
});

module.hot.accept();
