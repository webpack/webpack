import "./style.css";

const getFile = name =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

it("should work", async function (done) {
	const style = getFile("bundle.css");
	expect(style).toContain("color: red;");

	await import("./style2.css");

	const style2 = getFile("style2_css.css");
	expect(style2).toContain("color: red;");

	NEXT(require("../../update")(done, true, () => {
		const style = getFile("bundle.css");
		expect(style).toContain("color: blue;");
		const style2 = getFile("style2_css.css");
		expect(style2).toContain("color: blue;");

		done();
	}));
});

module.hot.accept();
