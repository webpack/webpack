import fs from "fs";
import path from "path";

export const asset = new URL("./thing.txt", import.meta.url);
export const hinted = new URL(/* webpackPreload: true */ "./hint.png", import.meta.url);

it("should load the hinted chunks and the stylesheet", async () => {
	const [lazy, pre] = await Promise.all([
		import(/* webpackChunkName: "lazy", webpackPrefetch: true */ "./lazy.js"),
		import(/* webpackChunkName: "pre", webpackPreload: true */ "./pre.js"),
		import("./style.css")
	]);

	expect(lazy.default).toBe("lazy");
	expect(pre.default).toBe("pre");
});

it("should write every url out when no devtool wraps a module", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	// The runtime module maps, and the asset url a module holds.
	expect(bundle).toContain(`${"chunk"}Urls = {`);
	expect(bundle).toContain(`${"css"}Urls = {`);
	expect(bundle).toContain(`"./${__NAME__}-thing.txt", import.meta.url)`);
});
