"use strict";

require("./helpers/warmup-webpack");

const os = require("os");
const path = require("path");
const fs = require("graceful-fs");
/** @type {{ sync: (pattern: string) => void }} */
const rimraf = require("rimraf");

describe("Compiler (directory junction)", () => {
	/** @type {string} */
	let base;

	beforeEach(() => {
		base = fs.mkdtempSync(path.join(os.tmpdir(), "webpack-junction-"));
	});

	afterEach(() => {
		rimraf.sync(base);
	});

	// Building through a directory junction (mklink /J) / symlink must not stall
	// at the emit phase, on any OS (#5915).
	it("should emit through a junction without hanging", (done) => {
		const webpack = require("..");

		const realDir = path.join(base, "real");
		const linkDir = path.join(base, "link");
		fs.mkdirSync(path.join(realDir, "app"), { recursive: true });
		fs.writeFileSync(path.join(realDir, "app", "index.js"), "console.log(1);");

		try {
			// real NTFS junction on Windows, symlink on POSIX (type is ignored there)
			fs.symlinkSync(realDir, linkDir, "junction");
		} catch (_err) {
			// no permission to create links in this environment
			return done();
		}

		const compiler = webpack({
			context: linkDir,
			mode: "production",
			entry: "./app/index.js",
			output: { path: path.join(linkDir, "dist"), filename: "main.js" }
		});
		compiler.run((err, stats) => {
			const finish = () => compiler.close(() => done());
			try {
				expect(err).toBeFalsy();
				expect(/** @type {import("../").Stats} */ (stats).hasErrors()).toBe(
					false
				);
				// the asset must physically exist at the junction target
				expect(fs.existsSync(path.join(realDir, "dist", "main.js"))).toBe(true);
			} catch (assertErr) {
				finish();
				throw assertErr;
			}
			finish();
		});
	});
});
