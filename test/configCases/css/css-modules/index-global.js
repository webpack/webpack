const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
  import("./use-style-global.js").then(({ default: x }) => {
		try {
			expect(x).toMatchSnapshot(prod ? "global prod" : "global dev");

			const fs = __non_webpack_require__("fs");
			const path = __non_webpack_require__("path");
			if (__STATS_I__ === 4 || __STATS_I__ === 5) {
				const cssOutputFilename = prod
					? `638.bundle${__STATS_I__}.css`
					: `use-style-global_js.bundle${__STATS_I__}.css`;

				const cssContent = fs.readFileSync(
					path.join(__dirname, cssOutputFilename),
					"utf-8"
				);
				expect(cssContent).toMatchSnapshot(prod ? "global prod" : "global dev");
			}
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
