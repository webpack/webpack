const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
  import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toMatchSnapshot(prod ? "prod" : "dev");

			const fs = __non_webpack_require__("fs");
			const path = __non_webpack_require__("path");
			if (__STATS_I__ === 0 || __STATS_I__ === 1) {
				let cssOutputFilename;
				if (prod) {
					const files = fs.readdirSync(__dirname);
					cssOutputFilename = files.find(f => /^\d+\.bundle1\.css$/.test(f));
					if (!cssOutputFilename) {
						throw new Error(
							`No production CSS chunk matching /^\\d+\\.bundle1\\.css$/ found in ${__dirname}. Files: ${files.join(", ")}`
						);
					}
				} else {
					cssOutputFilename = `use-style_js.bundle${__STATS_I__}.css`;
				}

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
