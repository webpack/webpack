"use strict";

/* describe it */
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
		watch: true,
		output: {
			path: tempFolderPath,
			filename: "bundle.js"
		}
	});
};

describe("RemovedFiles", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("watch tests excluded", () => {});
		return;
	}

	jest.setTimeout(10000);

	function cleanup() {
		rimraf.sync(tempFolderPath);
	}

	beforeEach(() => {
		cleanup();
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
	});
	afterEach(() => {
		cleanup();
	});

	it("should track removed files when they've been deleted in watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;

		compiler.hooks.watchRun.tap("RemovedFilesTest", compiler => {
			const removals = Array.from(compiler.removedFiles);
			if (removals.length > 0) {
				expect(removals).toContain(tempFilePath);
				watcher.close(done);
			}
		});

		watcher = compiler.watch({ aggregateTimeout: 50 }, () => {});

		setTimeout(() => {
			fs.unlinkSync(tempFilePath);
		}, 1000);
	});

	it("should not track removed files during initial watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;

		let watchRunFinished = new Promise(resolve => {
			compiler.hooks.watchRun.tap("RemovedFilesTest", compiler => {
				const removals = Array.from(compiler.removedFiles);
				expect(removals).toHaveLength(0);
				resolve();
			});
		});
		watcher = compiler.watch({ aggregateTimeout: 50 }, () => {});

		watchRunFinished.then(() => {
			watcher.close(done);
		});
	});

	it("should not track removed files when files have been modified", done => {
		const compiler = createSingleCompiler();
		let watcher;

		compiler.hooks.watchRun.tap("RemovedFilesTest", compiler => {
			const removals = Array.from(compiler.removedFiles);
			if (compiler.modifiedFiles.size > 0) {
				expect(removals).toHaveLength(0);
				watcher.close(done);
			}
		});

		watcher = compiler.watch({ aggregateTimeout: 50 }, () => {});

		setTimeout(() => {
			fs.appendFileSync(tempFilePath, "\nlet x = 'file modified';");
		}, 1000);
	});
});
