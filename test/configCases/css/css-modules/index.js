const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
  import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toMatchSnapshot(prod ? "prod" : "dev");

			const fs = __non_webpack_require__("fs");
			const path = __non_webpack_require__("path");
			const cssOutputFilename = prod ? "142.bundle1.css" : "use-style_js.bundle0.css";

			const cssContent = fs.readFileSync(
				path.join(__dirname, cssOutputFilename),
				"utf-8"
			);
			expect(cssContent).not.toContain(".my-app--");
			expect(cssContent).toMatchSnapshot(prod ? "prod" : "dev");
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
