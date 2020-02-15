"use strict";

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const webpack = require("..");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

const createCompiler = config => {
	const compiler = webpack(config);
	compiler.outputFileSystem = createFsFromVolume(new Volume());
	return compiler;
};

const tempFolderPath = path.join(__dirname, "ChangesAndRemovalsTemp");
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

const getChanges = compiler => {
	const modifiedFiles = compiler.modifiedFiles;
	const removedFiles = compiler.removedFiles;
	return {
		removed: removedFiles && Array.from(removedFiles),
		modified: modifiedFiles && Array.from(modifiedFiles)
	};
};

function cleanup(callback) {
	rimraf(tempFolderPath, callback);
}

function createFiles() {
	fs.mkdirSync(tempFolderPath, { recursive: true });

	fs.writeFileSync(
		tempFilePath,
		"module.exports = function temp() {return 'temp file';};\n require('./temp-file2')",
		"utf-8"
	);

	fs.writeFileSync(
		tempFile2Path,
		"module.exports = function temp2() {return 'temp file 2';};",
		"utf-8"
	);
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
			// Wait 2.5s after creating the files,
			// otherwise the newly-created files will trigger the webpack watch mode to re-compile.
			setTimeout(done, 2500);
		});
	});
	afterEach(cleanup);

	it("should not track modified/removed files during initial watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;
		const watchRunFinished = new Promise(resolve => {
			compiler.hooks.watchRun.tap("ChangesAndRemovalsTest", compiler => {
				expect(getChanges(compiler)).toEqual({
					removed: undefined,
					modified: undefined
				});
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
			expect(getChanges(compiler)).toEqual({
				modified: [tempFilePath],
				removed: []
			});
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
			expect(getChanges(compiler)).toEqual({
				removed: [tempFilePath],
				modified: []
			});
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
