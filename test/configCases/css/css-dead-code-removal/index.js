const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const prod = process.env.NODE_ENV === "production";

it("should tree shake CSS modules", done => {
	const fileName = prod ? "./649.bundle1.js" : "./import-style_js.bundle0.js";

	const cssFileName = prod ? "649.bundle1.css" : "import-style_js.bundle0.css";
	const cssContent = fs.readFileSync(
		path.join(__dirname, cssFileName),
		"utf-8"
	);

	__non_webpack_require__(fileName);

	import("./import-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				Button: prod ? "my-app-274-zx" : "./style.module.css-Button"
			});
			expect(cssContent).not.toContain(
				prod ? ".my-app--" : "./style.module.css-Unused"
			);
			expect(cssContent).not.toContain(
				prod ? ".my-app--" : "./style.module.css-Unused2"
			);
			// dead code removal only happens in production? why?
			if (prod) {
				expect(cssContent).not.toContain("color: green");
				expect(cssContent).not.toContain("color: yellow");
				expect(cssContent).toMatchSnapshot();
			}
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
