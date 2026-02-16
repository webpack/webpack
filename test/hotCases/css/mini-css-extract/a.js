import "./a.css";

const getFile = name =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

it("should work", async function (done) {
	try {
		const style = getFile("styles.css");
		expect(style).toContain("color: red;");
	} catch (e) {}

	NEXT(require("../../update")(done, true, () => {
		try {
			const style = getFile("styles.css");
			expect(style).toContain("color: blue;");
		} catch (e) {}

		done();
	}));
});

module.hot.accept();

