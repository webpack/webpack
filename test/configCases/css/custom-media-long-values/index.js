import "./list.css";
import "./long.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should stop writing out a comma list of custom media once it is past the limit", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toContain("@media (--list)");
	expect(css).toContain(".after-list");
	const { list } = JSON.parse(
		fs.readFileSync(path.join(__dirname, "build-times.json"), "utf-8")
	);
	// A build restored from the cache does not parse the list again.
	if (list !== undefined) expect(list).toBeLessThan(4000);
});

it("should write out a long custom media used once when it fits the limit", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).not.toContain("(--long)");
	expect(css).toMatch(/@media \(min-width: 1px\) and \(min-width: 1px\)/);
	expect(css).toContain(".after-long");
});
