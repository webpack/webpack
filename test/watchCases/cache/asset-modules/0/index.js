import { stat } from "fs";
import { promisify } from "util";

it("should return a valid url when cached", async () => {
	const url = new URL("file.txt", import.meta.url);
	expect(url.pathname).toMatch(/\.txt$/);
	expect((await promisify(stat)(url)).isFile()).toBe(true);
});

it("should return a valid url when modified", async () => {
	const url = new URL("other.txt", import.meta.url);
	expect(url.pathname).toMatch(/\.txt$/);
	expect((await promisify(stat)(url)).isFile()).toBe(true);
});

it("should not emit undefined files", () => {
	expect(STATS_JSON.assets.map(a => a.name)).not.toContain(undefined);
	expect(STATS_JSON.assets.map(a => a.name)).not.toContain("undefined");
});
