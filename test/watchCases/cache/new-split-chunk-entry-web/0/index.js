import fs from "fs";
import path from "path";

it("should include the correct split chunk ids in entry", async () => {
	if (Math.random() < 0) import("./module");
	const runtimeId = STATS_JSON.chunks.find(c => c.names.includes("runtime")).id;
	const entryCode = fs.readFileSync(
		path.resolve(__dirname, "entry.js"),
		"utf-8"
	);
	STATE.allIds = new Set([
		...(STATE.allIds || []),
		...STATS_JSON.entrypoints.entry.chunks
	]);
	const expectedIds = Array.from(STATE.allIds).filter(
		id => STATS_JSON.entrypoints.entry.chunks.includes(id) && id !== runtimeId
	);
	try {
		for (const id of STATE.allIds) {
			const expected = expectedIds.includes(id);
			(expected ? expect(entryCode) : expect(entryCode).not).toMatch(
				new RegExp(`[\\[,]${id}[\\],]`)
			);
		}
	} catch (e) {
		throw new Error(
			`Entrypoint code should contain only these chunk ids: ${expectedIds.join(
				", "
			)}\n${e.message}`
		);
	}
});
