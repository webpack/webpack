import fs from "fs";
import value from "./data.ts";

const greeting: string = `hello-${value}`;

it("should run the strip-types transform after a user loader", () => {
	expect(greeting).toBe("hello-from-loader");
});

it("should compose the loader source map with the strip-types source map", () => {
	const sourceMap = JSON.parse(fs.readFileSync(__filename + ".map", "utf8"));
	const sources: string[] = sourceMap.sources;

	// data.ts (the loader's original input) must survive composition.
	const dataIndex = sources.findIndex((s: string) => /data\.ts$/.test(s));
	expect(dataIndex).not.toBe(-1);

	// The sourcesContent for data.ts must be the on-disk content *before*
	// the banner loader prepended its banner. If composition was wrong, we'd
	// see either the post-loader content (banner included) or no content.
	const dataContent = sourceMap.sourcesContent[dataIndex];
	expect(dataContent).toContain('const value: string = "from-loader"');
	expect(dataContent).not.toMatch(/^\/\/ banner/);

	// The TS-only annotation (`: string`) must survive on the original
	// source even though it's stripped from the emitted bundle.
	expect(dataContent).toMatch(/: string\b/);

	// index.ts itself ran through strip-types without a user loader; verify
	// its source content is also intact (the no-loader path).
	const indexIndex = sources.findIndex((s: string) => /index\.ts$/.test(s));
	expect(indexIndex).not.toBe(-1);
	const indexContent = sourceMap.sourcesContent[indexIndex];
	expect(indexContent).toContain("const greeting: string");
});
