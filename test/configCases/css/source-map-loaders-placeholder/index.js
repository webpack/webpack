import "!./loader.js!./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep the readable-identifier prefix out of [loaders]", () => {
	const mapFile = fs.readdirSync(__dirname).find((f) => f.endsWith(".css.map"));
	if (!mapFile) throw new Error("No .css.map emitted");
	const map = JSON.parse(fs.readFileSync(path.join(__dirname, mapFile), "utf-8"));
	expect(map.sources).toStrictEqual([
		"webpack:///./style.css?loaders=./loader.js"
	]);
});
