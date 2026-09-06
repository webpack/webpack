const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// splitChunks renames the extracted stylesheet after its cache group, so the
// name is discovered rather than spelled out.
const readStyles = () => {
	const name = fs.readdirSync(__dirname).find(f => f.endsWith(".css"));
	return fs.readFileSync(path.join(__dirname, name), "utf-8");
};

it("should apply a hot update to the extracted stylesheet", done => {
	expect(readStyles()).toContain("color: red;");

	NEXT(
		require("../../update")(done, true, () => {
			expect(readStyles()).toContain("color: blue;");

			NEXT(
				require("../../update")(done, true, () => {
					expect(readStyles()).toContain("color: green;");

					done();
				})
			);
		})
	);
});
