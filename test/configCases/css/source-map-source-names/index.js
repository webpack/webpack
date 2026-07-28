import "./style.css";
import * as s from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readMap = (extension) => {
	const mapFile = fs.readdirSync(__dirname).find((f) => f.endsWith(extension));
	if (!mapFile) throw new Error(`No ${extension} emitted`);
	return JSON.parse(fs.readFileSync(path.join(__dirname, mapFile), "utf-8"));
};

const contentOf = (map, source) =>
	map.sourcesContent[map.sources.indexOf(source)];

it("should name css sources by their resource path, like js sources", () => {
	// reference the module so the css module stays in the graph
	expect(typeof s.title).toBe("string");
	const map = readMap(".css.map");
	expect(map.sources).toContain("webpack:///./style.css");
	expect(map.sources).toContain("webpack:///./style.module.css");
	expect(contentOf(map, "webpack:///./style.module.css")).toContain(".title");
	// no source keeps the readable-identifier "css " prefix or option suffixes
	for (const source of map.sources) {
		expect(source).not.toMatch(/webpack:\/\/\/css /);
	}
});

it("should disambiguate css modules sharing a resource path by hash", () => {
	const map = readMap(".css.map");
	// `shared.css` is imported under two layers, so it is two modules
	const shared = map.sources.filter((source) =>
		source.startsWith("webpack:///./shared.css")
	);
	expect(shared).toHaveLength(2);
	expect(shared).toContain("webpack:///./shared.css");
	expect(
		shared.filter((source) =>
			/^webpack:\/\/\/\.\/shared\.css\?\w+$/.test(source)
		)
	).toHaveLength(1);
	for (const source of shared) {
		expect(contentOf(map, source)).toContain("color: green");
	}
});

it("should name the js wrapper of a css module by its resource path too", () => {
	const map = readMap(".js.map");
	expect(map.sources).toContain("webpack:///./style.module.css");
	// same name in both maps, so it must carry the same content
	expect(contentOf(map, "webpack:///./style.module.css")).toContain(".title");
	for (const source of map.sources) {
		expect(source).not.toMatch(/webpack:\/\/\/css /);
	}
});
