"use strict";

const { moduleScope } = require("../helpers/holdChunkResponses");

it("fails both matching held chunk responses", async () => {
	/** @type {{ HOLD?: import("../helpers/holdChunkResponses").ChunkResponseHold }} */
	const scope = {};
	moduleScope(scope, {});
	const hold = /** @type {NonNullable<typeof scope.HOLD>} */ (scope.HOLD);
	hold.nativeImport = async () => ({});
	hold.start(/\.js$/);
	const first = hold.importChunk("first.js");
	const second = hold.importChunk("second.js");
	expect(hold.count()).toBe(2);

	const failures = Promise.all([
		expect(first).rejects.toThrow("Failed to fetch first.js"),
		expect(second).rejects.toThrow("Failed to fetch second.js")
	]);
	hold.fail(/\.js$/);
	const countAfterFail = hold.count();
	if (countAfterFail !== 0) hold.release();
	await failures;
	expect(countAfterFail).toBe(0);
	expect(hold.count()).toBe(0);
});
