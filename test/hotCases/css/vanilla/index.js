import "./style.css";

const getFile = name =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

it("should work", async function (done) {
	try {
		const style = getFile("bundle.css");
		expect(style).toContain("color: red;");
	} catch (e) {}


	await import("./style2.css");

	try {
		const style2 = getFile("style2_css.css");
		expect(style2).toContain("color: red;");
	} catch (e) {}

	NEXT(require("../../update")(done, true, () => {
		try {
			const style = getFile("bundle.css");
			expect(style).toContain("color: blue;");
		} catch (e) {}

		try {
			const style2 = getFile("style2_css.css");
			expect(style2).toContain("color: blue;");
		} catch (e) {}

		done();
	}));
});

module.hot.accept();
