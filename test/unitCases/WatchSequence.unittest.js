"use strict";

const generateWatchSequence = require("../helpers/generateWatchSequence");
const minimizeWatchSequence = require("../helpers/minimizeWatchSequence");

describe("generated watch sequences", () => {
	it("should reproduce a seed while varying the order for another seed", () => {
		expect(generateWatchSequence(42)).toEqual(generateWatchSequence(42));
		expect(generateWatchSequence(42)).not.toEqual(generateWatchSequence(43));
		expect(new Set(generateWatchSequence(42).map(({ kind }) => kind))).toEqual(
			new Set([
				"add",
				"value",
				"retarget",
				"rename",
				"remove",
				"restore",
				"break",
				"repair",
				"side-effects",
				"package-main"
			])
		);
	});

	it("should retain the ordered edits required to reproduce a failure", async () => {
		/**
		 * @param {string[]} sequence operations
		 * @returns {Promise<boolean>} whether the failure remains
		 */
		const fails = async (sequence) =>
			sequence.indexOf("remove") >= 0 &&
			sequence.indexOf("restore") > sequence.indexOf("remove");
		const result = await minimizeWatchSequence(
			["edit", "remove", "edit", "retarget", "restore", "edit"],
			fails
		);
		expect(result).toEqual(["remove", "restore"]);
		for (let index = 0; index < result.length; index++) {
			expect(
				await fails(result.filter((_, position) => position !== index))
			).toBe(false);
		}
	});

	it("should report an empty sequence when the initial build already fails", async () => {
		expect(await minimizeWatchSequence([1, 2, 3], async () => true)).toEqual(
			[]
		);
	});

	it("should keep every operation when none can be removed", async () => {
		expect(
			await minimizeWatchSequence(
				[1, 2, 3],
				async (sequence) => sequence.length === 3
			)
		).toEqual([1, 2, 3]);
	});
});
