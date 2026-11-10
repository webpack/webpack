// `fs` and `path` come from the runner (`moduleScope` in `test.config.js`):
// bundling them would make this universal build warn.
import "./foo.css";

const readFile = (filename) => {
	let dirname;
	if (typeof window !== "undefined") {
		dirname = __STATS__.outputPath;
	} else {
		dirname = __dirname;
	}
	return fs.readFileSync(path.join(dirname, filename), "utf-8");
};

const getSourceMap = (filename) => {
	return JSON.parse(readFile(filename));
};

it("should compile successfully and have individual css sourcemap", async () => {
	let map = getSourceMap("bundle0.css.map");
	expect(map.sources).toStrictEqual([
		"webpack:///./bar.css",
		"webpack:///./foo.css"
	]);
	expect(() => {
		readFile("bundle0.js.map");
	}).toThrow();
});
