const fs = require("fs");
const path = require("path");

it("should rebuild on a module change", () => {
	expect(require("./changing-module")).toBe(WATCH_STEP);
});

it("should preserve the file behind the replaced link", () => {
	expect(
		fs.readFileSync(`${OUTPUT_PATH}-old/step.0.txt`, "utf8")
	).toBe("foreign");
});

it("should write through the emitted link", () => {
	const target = `${OUTPUT_PATH}-${
		Number(WATCH_STEP) < 2 ? "new" : "next"
	}`;
	expect(
		fs.readFileSync(
			path.join(target, `step.${WATCH_STEP}.txt`),
			"utf8"
		)
	).toBe("emitted");
});

it("should remove its obsolete files after replacing the link", () => {
	for (let step = 0; step < Number(WATCH_STEP); step++) {
		const target = `${OUTPUT_PATH}-${step < 2 ? "new" : "next"}`;
		expect(fs.existsSync(path.join(target, `step.${step}.txt`))).toBe(DRY_RUN);
	}
});

it("should keep the previous hot update after replacing the link", () => {
	for (let step = 0; step <= Number(WATCH_STEP); step++) {
		const target = `${OUTPUT_PATH}-${step < 2 ? "new" : "next"}`;
		expect(fs.existsSync(path.join(target, `${step}.hot-update.json`))).toBe(
			DRY_RUN || step >= Number(WATCH_STEP) - 1
		);
	}
});
