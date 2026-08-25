import fs from "fs";
import path from "path";

const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

const nameStartingWith = (prefix) =>
	STATS_JSON.assets.find((asset) => asset.name.startsWith(prefix)).name;

it("should move its own name when the name it bakes moves", async () => {
	const lazy = nameStartingWith("lazy.");
	const self = nameStartingWith("bundle.");
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, self),
		"utf8"
	);

	expect((await load()).value).toBe(WATCH_STEP === "0" ? "zero" : "one");
	// It really baked, and names the file that exists in this build.
	expect(source).toContain(`"./${lazy}"`);

	if (WATCH_STEP === "0") {
		STATE.lazy = lazy;
		STATE.self = self;
	} else {
		expect(lazy).not.toBe(STATE.lazy);
		// Nothing but the fold moves this one: `[chunkhash]` reads this chunk's own
		// modules, and the rebuild changed a module of the other chunk.
		expect(self).not.toBe(STATE.self);
	}
});
