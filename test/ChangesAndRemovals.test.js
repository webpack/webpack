"use strict";

const path = require("path");
const MemoryFs = require("memory-fs");
const webpack = require("..");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

const createCompiler = config => {
	const compiler = webpack(config);
	compiler.outputFileSystem = new MemoryFs();
	return compiler;
};

const tempFolderPath = path.join(__dirname, "temp");
const tempFilePath = path.join(tempFolderPath, "temp-file.js");
const tempFile2Path = path.join(tempFolderPath, "temp-file2.js");

const createSingleCompiler = () => {
	return createCompiler({
		entry: tempFilePath,
		output: {
			path: tempFolderPath,
			filename: "bundle.js"
		}
	});
};

const onceDone = (compiler, action) => {
	let initial = true;
	compiler.hooks.done.tap("ChangesAndRemovalsTest", () => {
		if (!initial) return;
		initial = false;
		setTimeout(action, 1000);
	});
};

function cleanup(callback) {
	rimraf(tempFolderPath, callback);
}

function createFiles() {
	fs.mkdirSync(tempFolderPath);

	// Set file timestamps to 5 seconds earlier,
	// otherwise the newly-created files will trigger the webpack watch mode to re-compile.
	let fakeTime = new Date(Date.now() - 5000);
	fs.writeFileSync(
		tempFilePath,
		"module.exports = function temp() {return 'temp file';};\n require('./temp-file2')",
		"utf-8"
	);
	fs.utimesSync(tempFilePath, fakeTime, fakeTime);
	fs.writeFileSync(
		tempFile2Path,
		"module.exports = function temp2() {return 'temp file 2';};",
		"utf-8"
	);
	fs.utimesSync(tempFile2Path, fakeTime, fakeTime);
}

describe("ChangesAndRemovals", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("watch tests excluded", () => {});
		return;
	}

	jest.setTimeout(30000);

	beforeEach(done => {
		cleanup(err => {
			if (err) return done(err);
			createFiles();
			done();
		});
	});
	afterEach(cleanup);

	it("should not track modified/removed files during initial watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;
		const watchRunFinished = new Promise(resolve => {
			compiler.hooks.watchRun.tap("ChangesAndRemovalsTest", compiler => {
				expect(compiler.modifiedFiles).toBe(undefined);
				expect(compiler.removedFiles).toBe(undefined);
				resolve();
			});
		});
		watcher = compiler.watch({ aggregateTimeout: 200 }, err => {
			if (err) done(err);
		});

		watchRunFinished.then(() => {
			watcher.close(done);
		});
	});

	it("should track modified files when they've been modified", done => {
		const compiler = createSingleCompiler();
		let watcher;

		compiler.hooks.watchRun.tap("ChangesAndRemovalsTest", compiler => {
			if (!watcher) return;
			if (!compiler.modifiedFiles) return;
			const modifications = Array.from(compiler.modifiedFiles);
			expect(modifications).toContain(tempFilePath);
			const removals = Array.from(compiler.removedFiles);
			expect(removals).toHaveLength(0);
			watcher.close(done);
			watcher = null;
		});

		watcher = compiler.watch({ aggregateTimeout: 200 }, err => {
			if (err) done(err);
		});

		onceDone(compiler, () => {
			fs.appendFileSync(tempFilePath, "\nlet x = 'file modified';");
		});
	});

	it("should track removed file when removing file", done => {
		const compiler = createSingleCompiler();
		let watcher;

		compiler.hooks.watchRun.tap("ChangesAndRemovalsTest", compiler => {
			if (!watcher) return;
			if (!compiler.modifiedFiles) return;
			const removals = Array.from(compiler.removedFiles);
			expect(removals).toContain(tempFilePath);
			const modifications = Array.from(compiler.modifiedFiles);
			expect(modifications).toHaveLength(0);
			watcher.close(done);
			watcher = null;
		});

		watcher = compiler.watch({ aggregateTimeout: 200 }, err => {
			if (err) done(err);
		});

		onceDone(compiler, () => {
			fs.unlinkSync(tempFilePath);
		});
	});
});
