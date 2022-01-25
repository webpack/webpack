import imported from "./imported.mjs";
import value from "./module";
import { metaUrl } from "./meta";

it("should allow to use externals in concatenated modules", () => {
	expect(imported).toBe(42);
	expect(value).toBe(40);
});

it("all bundled files should have same url, when module.importMeta.url === false", () => {
	export const localMetaUrl = import.meta.url;
	expect(localMetaUrl).toBe(metaUrl)
});
