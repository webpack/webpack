import css from "./style.css";

const fs = __nodeFs;
const path = __nodePath;

// Referencing the export keeps the value-returning `text` module in the bundle.
if (typeof css !== "string") throw new Error("expected the css text export");

const { outputPath } = __STATS__.children[__STATS_I__];
const bundle = fs.readFileSync(
	path.join(outputPath, `bundle${__STATS_I__}.js`),
	"utf-8"
);
const hasInlineMap = /sourceMappingURL=data:application\/json/.test(bundle);

if (__STATS_I__ === 2) {
	it("should inline a map into the css payload for source-map", () => {
		expect(hasInlineMap).toBe(true);
	});
} else {
	// the inlined map would otherwise ship the sources inside the bundle
	it("should not inline a map into the css payload for hidden devtools", () => {
		expect(hasInlineMap).toBe(false);
	});
}
