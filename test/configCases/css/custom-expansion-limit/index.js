import "./selectors.css";
import "./media.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should stop writing out custom selectors and media that double with each definition", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css.length).toBeLessThan(100000);
	// Names under the limit are still written out.
	expect(css).toContain(":is(.ok-a, .ok-b)");
	expect(css).toContain("@media (min-width: 100px)");
	// Names past it are left as written, and the rest of the file is kept.
	expect(css).toContain(":--s18");
	expect(css).toContain("(--m18)");
	expect(css).toContain(".after-selectors");
	expect(css).toContain(".after-media");
});
