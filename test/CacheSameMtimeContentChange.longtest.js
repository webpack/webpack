"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("..");

const tempDir = fs.mkdtempSync(
	path.join(require("os").tmpdir(), "webpack-same-mtime-")
);
const srcDir = path.join(tempDir, "src");

const writeValue = (value, keepMtime) => {
	const file = path.join(srcDir, "value.js");
	let previous;
	if (keepMtime) {
		previous = fs.statSync(file).mtime;
	}
	fs.writeFileSync(file, `export const value = ${JSON.stringify(value)};\n`);
	if (previous) {
		// A restore from an archive or a rename carrying the old time keeps the
		// timestamp while the content changes.
		fs.utimesSync(file, previous, previous);
	}
};

const build = (callback) => {
	webpack(
		{
			mode: "production",
			context: srcDir,
			entry: "./index.js",
			output: { path: path.join(tempDir, "dist") },
			cache: {
				type: "filesystem",
				cacheDirectory: path.join(tempDir, ".cache")
			}
		},
		(err, stats) => callback(err, stats)
	);
};

const bundleContent = () =>
	fs.readFileSync(path.join(tempDir, "dist", "main.js"), "utf8");

describe("persistent cache with { timestamp: true, hash: true } snapshots", () => {
	beforeAll(() => {
		fs.mkdirSync(srcDir, { recursive: true });
		fs.writeFileSync(
			path.join(srcDir, "index.js"),
			'import { value } from "./value.js";\nconsole.log(value);\n'
		);
		writeValue("AAAA");
	});

	it("builds and stores the content in the bundle", (done) => {
		build((err) => {
			expect(err).toBeNull();
			expect(bundleContent()).toContain("AAAA");
			done();
		});
	});

	it("rebuilds when the content changes while the timestamp is kept", (done) => {
		writeValue("BBBB", true);
		build((err) => {
			expect(err).toBeNull();
			expect(bundleContent()).toContain("BBBB");
			done();
		});
	});

	it("keeps the cache valid when only the timestamp churns", (done) => {
		const before = bundleContent();
		// A touch of unchanged content must not invalidate (the hash decides).
		const file = path.join(srcDir, "value.js");
		fs.writeFileSync(file, fs.readFileSync(file));
		const now = new Date();
		fs.utimesSync(file, now, now);
		build((err) => {
			expect(err).toBeNull();
			expect(bundleContent()).toBe(before);
			done();
		});
	});
});
