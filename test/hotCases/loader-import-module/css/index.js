import stylesheet from "./stylesheet.css.js";

it("should be able to use build-time code with HMR", done => {
	expect(stylesheet).toBe(
		'body { background: url("https://test.cases/path/assets/file.png"); color: #f00; }'
	);
	NEXT(
		require("../../update")(done, true, stats => {
			expect(stylesheet).toBe(
				'body { background: url("https://test.cases/path/assets/file.png"); color: #0f0; }'
			);
			NEXT(
				require("../../update")(done, true, stats => {
					expect(stylesheet).toBe(
						'body { background: url("https://test.cases/path/assets/file.jpg"); color: #0f0; }'
					);
					done();
				})
			);
		})
	);
});

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./stylesheet.css.js");
}
