const getFile = name =>
	__non_webpack_require__("fs").readFileSync(
		__non_webpack_require__("path").join(__dirname, name),
		"utf-8"
	);

it("should work", done => {
	try {
		const style = getFile("css-entry.css");
		expect(style).toContain("color: red;");
	} catch (e) {}

	NEXT(
		require("../../update")(done, true, () => {
			try {
				const style = getFile("css-entry.css");
				expect(style).toContain("color: blue;");
			} catch (e) {}

			NEXT(
				require("../../update")(done, true, () => {
					try {
						const style = getFile("css-entry.css");
						expect(style).toContain("color: green;");
					} catch (e) {}

					done();
				})
			);
		})
	);
});

