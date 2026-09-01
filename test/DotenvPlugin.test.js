"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");

const tempPath = path.resolve(__dirname, "js", "dotenv-plugin");

/**
 * @param {string} name fixture name
 * @param {Record<string, string>} files files to write, relative to the fixture
 * @returns {string} fixture context path
 */
const createFixture = (name, files) => {
	const context = path.resolve(tempPath, name);
	rimraf.sync(context);
	fs.mkdirSync(context, { recursive: true });
	fs.writeFileSync(path.resolve(context, "index.js"), "module.exports = 1;");
	for (const [file, content] of Object.entries(files)) {
		fs.writeFileSync(path.resolve(context, file), content);
	}
	return context;
};

/**
 * @param {string} context fixture context path
 * @returns {Promise<Error | null>} the compiler-level error, if any
 */
const compile = (context) => {
	const webpack = require("..");

	return new Promise((resolve, reject) => {
		webpack(
			{
				mode: "development",
				context,
				entry: "./index.js",
				dotenv: { template: [".env"] },
				output: { path: path.resolve(context, "dist") }
			},
			(err, stats) => {
				if (err) return resolve(err);
				if (stats && stats.hasErrors()) {
					return reject(
						new Error(stats.toString({ all: false, errors: true }))
					);
				}
				resolve(null);
			}
		);
	});
};

/**
 * @returns {boolean} whether mode bits actually deny this process a read
 */
const canDenyRead = () => {
	const probe = path.resolve(tempPath, "probe");
	try {
		fs.mkdirSync(tempPath, { recursive: true });
		fs.writeFileSync(probe, "");
		fs.chmodSync(probe, 0o000);
		fs.readFileSync(probe);
		return false;
	} catch (_err) {
		return true;
	} finally {
		rimraf.sync(probe);
	}
};

describe("DotenvPlugin", () => {
	beforeAll(() => {
		rimraf.sync(tempPath);
	});

	it("should treat a missing dotenv file as normal", async () => {
		const context = createFixture("missing", {});
		await expect(compile(context)).resolves.toBeNull();
	});

	it("should read a dotenv file that exists", async () => {
		const context = createFixture("present", {
			".env": "WEBPACK_FROM_FILE=value\n"
		});
		await expect(compile(context)).resolves.toBeNull();
	});

	it("should report a dotenv path that is a directory", async () => {
		const context = createFixture("directory", {});
		fs.mkdirSync(path.resolve(context, ".env"));

		const err = await compile(context);

		expect(/** @type {Error} */ (err).message).toMatch(
			/while reading the dotenv file/
		);
		expect(/** @type {NodeJS.ErrnoException} */ (err).code).toBe("EISDIR");
	});

	// root ignores mode bits, so an unreadable file cannot be produced there
	(canDenyRead() ? it : it.skip)(
		"should report an unreadable dotenv file",
		async () => {
			const context = createFixture("unreadable", { ".env": "A=1\n" });
			const envPath = path.resolve(context, ".env");
			fs.chmodSync(envPath, 0o000);

			const err = await compile(context);

			fs.chmodSync(envPath, 0o644);
			expect(/** @type {NodeJS.ErrnoException} */ (err).code).toBe("EACCES");
		}
	);
});
