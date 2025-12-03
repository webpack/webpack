const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
  import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toMatchSnapshot(prod ? "prod" : "dev");

			const fs = __non_webpack_require__("fs");
			const path = __non_webpack_require__("path");
			if (__STATS_I__ === 0 || __STATS_I__ === 1) {
				const cssOutputFilename = prod
					? `142.bundle${__STATS_I__}.css`
					: `use-style_js.bundle${__STATS_I__}.css`;

				const cssContent = fs.readFileSync(
					path.join(__dirname, cssOutputFilename),
					"utf-8"
				);
				expect(cssContent).toMatchSnapshot(prod ? "prod" : "dev");
			}
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
