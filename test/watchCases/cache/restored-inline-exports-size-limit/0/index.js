import values from "./consumer";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// Inlining stops above 6 bytes, so the literal comes, goes and comes back.
const steps = [
	["abc", 1, true],
	["abcdefgh", 1234567, false],
	["xyz", 9, true]
];

// Joined at runtime, since this file is part of the bundle it reads
const marker = (name) => ["inlined export", name].join(" .");

it("should add and drop an inlined literal across the size limit", () => {
	const [short, num, inlined] = steps[Number(WATCH_STEP)];
	expect(values).toEqual([short, num]);
	const bundle = emitted("bundle.js");
	if (inlined) {
		expect(bundle).toContain(`${marker("SHORT")} */${JSON.stringify(short)}`);
		expect(bundle).toContain(`${marker("NUM")} */${num}`);
	} else {
		expect(bundle).not.toContain(marker("SHORT"));
		expect(bundle).not.toContain(marker("NUM"));
	}
});
