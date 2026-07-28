import "./style.css";
import * as s from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should name css sources by their resource path, like js sources", () => {
	// reference the module so the css module stays in the graph
	expect(typeof s.title).toBe("string");
	const mapFile = fs.readdirSync(__dirname).find((f) => f.endsWith(".css.map"));
	const map = JSON.parse(fs.readFileSync(path.join(__dirname, mapFile), "utf-8"));
	expect(map.sources).toContain("webpack:///./style.css");
	expect(map.sources).toContain("webpack:///./style.module.css");
	// no source keeps the readable-identifier "css " prefix or option suffixes
	for (const source of map.sources) {
		expect(source).not.toMatch(/webpack:\/\/\/css /);
	}
});

it("should name the js wrapper of a css module by its resource path too", () => {
	const mapFile = fs.readdirSync(__dirname).find((f) => f.endsWith(".js.map"));
	const map = JSON.parse(fs.readFileSync(path.join(__dirname, mapFile), "utf-8"));
	expect(map.sources).toContain("webpack:///./style.module.css");
	for (const source of map.sources) {
		expect(source).not.toMatch(/webpack:\/\/\/css /);
	}
});
