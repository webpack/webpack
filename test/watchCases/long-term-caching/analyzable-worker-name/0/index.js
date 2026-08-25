import fs from "fs";
import path from "path";

// Never called: building the chunk is the point, running the worker is not.
const spawn = () =>
	new Worker(new URL("./work.js", import.meta.url), { type: "module" });

const nameStartingWith = (prefix) =>
	STATS_JSON.assets.find((asset) => asset.name.startsWith(prefix)).name;

it("should move its own name when the worker chunk it names moves", () => {
	expect(typeof spawn).toBe("function");
	const worker = nameStartingWith("work_js.");
	const self = nameStartingWith("bundle.");
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, self),
		"utf8"
	);

	expect(source).toContain(`"./${worker}"`);
	if (WATCH_STEP === "0") {
		STATE.worker = worker;
		STATE.self = self;
	} else {
		expect(worker).not.toBe(STATE.worker);
		expect(self).not.toBe(STATE.self);
	}
});
