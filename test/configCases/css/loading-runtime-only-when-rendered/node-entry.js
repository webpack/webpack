import "./style.css";
// `fs` and `path` come from the runner (`moduleScope` in `test.config.js`):
// bundling them would make this universal build warn.
import { CSS_FILENAME_HELPER, CSS_FILENAME_MODULE } from "./needles.js";

// Targeting node turns a stylesheet into a javascript module, so no chunk is
// emitted as css and the loading branch that names one is never rendered.
it("should not ship the css chunk filename without a stylesheet to load", async () => {
	const name = "lazy";
	const { lazy } = await import(`./${name}.js`);
	expect(lazy).toBe("lazy");
	const { outputPath } = __STATS__.children[__STATS_I__];
	const source = fs.readFileSync(path.join(outputPath, "node/main.mjs"), "utf-8");
	expect(source).not.toContain(CSS_FILENAME_MODULE);
	expect(source).not.toContain(CSS_FILENAME_HELPER);
});
