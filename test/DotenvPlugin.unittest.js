"use strict";

const DotenvPlugin = require("../lib/DotenvPlugin");

const inputFileSystem = /** @type {EXPECTED_ANY} */ ({});

describe("DotenvPlugin", () => {
	it.each(["ENOENT", "ENOTDIR"])(
		"tracks %s errors as missing dotenv files",
		async (code) => {
			const error = Object.assign(new Error("missing"), { code });
			const plugin = /** @type {EXPECTED_ANY} */ (
				new DotenvPlugin({ template: [".env"] })
			);
			plugin._loadFile = () => Promise.reject(error);

			await expect(
				plugin._getParsed(inputFileSystem, "/project", "development")
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
		const plugin = /** @type {EXPECTED_ANY} */ (
			new DotenvPlugin({ template: [".env"] })
		);
		plugin._loadFile = () => Promise.reject(error);

		await expect(
			plugin._getParsed(inputFileSystem, "/project", "development")
		).rejects.toBe(error);
	});
});
