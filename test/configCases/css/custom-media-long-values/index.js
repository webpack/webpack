import "./list.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should stop writing out a comma list of custom media once it is past the limit", () => {
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toContain("@media (--list)");
	expect(css).toContain(".after-list");
	const { list } = JSON.parse(
		fs.readFileSync(path.join(__dirname, "build-times.json"), "utf-8")
	);
	expect(list).toBeLessThan(4000);
});
