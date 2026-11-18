import fs from "fs";
import path from "path";

class NotURL {
	/**
	 * @param {string} url url
	 */
	constructor(url) {
		this.url = url;
	}
}

/**
 * @returns {NotURL} never called, only parsed
 */
export function notAWorker() {
	return new Worker(new NotURL(import.meta.url));
}

it("should resolve directory and ignored URLs against the module base", () => {
	const dir = new URL(".", import.meta.url);
	expect(dir.href.endsWith("/")).toBe(true);
	const ignored = new URL(
		/* webpackIgnore: true */ "./other.txt",
		import.meta.url
	);
	expect(ignored.href).toBe(new URL("./other.txt", dir).href);
});

it("should bundle what an ignored URL's first argument requires", () => {
	const url = new URL(
		/* webpackIgnore: true */ require("./name.js"),
		import.meta.url
	);
	expect(url.href.endsWith("/name.txt")).toBe(true);
});

it("should not treat a constructor other than URL as a worker URL", () => {
	const files = fs.readdirSync(__STATS__.outputPath);
	expect(files.filter(file => file.endsWith(".mjs"))).toEqual(["bundle0.mjs"]);
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);
	expect(bundle).not.toContain(`/* worker ${"import"} */`);
});
