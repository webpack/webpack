"use strict";

const DotenvPlugin = require("../lib/DotenvPlugin");

describe("DotenvPlugin", () => {
	it.each(["ENOENT", "ENOTDIR"])(
		"tracks %s errors as missing dotenv files",
		async (code) => {
			const error = Object.assign(new Error("missing"), { code });
			const fs = /** @type {EXPECTED_ANY} */ ({
				readFile: (
					/** @type {string} */ _file,
					/** @type {EXPECTED_ANY} */ callback
				) => process.nextTick(() => callback(error))
			});

			await expect(
				new DotenvPlugin({ template: [".env"] })._getParsed(
					fs,
					"/project",
					"development"
				)
			).resolves.toMatchObject({
				missingDependencies: ["/project/.env"],
				parsed: {}
			});
		}
	);

	it("propagates errors reading configured dotenv files", async () => {
		const error = Object.assign(new Error("permission denied"), {
			code: "EACCES"
		});
		const fs = /** @type {EXPECTED_ANY} */ ({
			readFile: (
				/** @type {string} */ _file,
				/** @type {EXPECTED_ANY} */ callback
			) => process.nextTick(() => callback(error))
		});

		await expect(
			new DotenvPlugin({ template: [".env"] })._getParsed(
				fs,
				"/project",
				"development"
			)
		).rejects.toBe(error);
	});
});
