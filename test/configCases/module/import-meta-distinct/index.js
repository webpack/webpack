import { pathToFileURL } from "url";
import path from "path";
import { meta as depMeta, getMeta } from "./dep";

const directory = "./test/configCases/module/import-meta-distinct/";
const indexUrl = pathToFileURL(path.resolve(`${directory}index.js`)).toString();
const depUrl = pathToFileURL(path.resolve(`${directory}dep.js`)).toString();

it("should give each module its own import.meta", () => {
	expect(import.meta).not.toBe(depMeta);
	expect(import.meta).not.toBe(getMeta());
	expect(depMeta).toBe(getMeta());
});

it("should keep the url of the module the import.meta belongs to", () => {
	const own = import.meta;
	expect(own.url).toBe(indexUrl);
	expect(depMeta.url).toBe(depUrl);
});

it("should keep unknown properties observable", () => {
	import.meta.UNKNOWN_PROPERTY = "HELLO";
	const own = import.meta;
	expect(own.UNKNOWN_PROPERTY).toBe("HELLO");
	expect(getMeta().UNKNOWN_PROPERTY).toBe("HELLO");
});
