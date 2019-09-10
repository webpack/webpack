"use strict";

/* globals describe it */
const path = require("path");
const MemoryFs = require("memory-fs");
const webpack = require("../");
const fs = require("fs");
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

describe("ModifiedFiles", () => {
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
		// Wait 1s, otherwise the newly-created files will trigger our test compilers to re-compile.
	});
	afterEach(() => {
		cleanup();
	});

	it("should track modified files when they've been modified in watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;

		compiler.hooks.watchRun.tap("ModifiedFilesTest", compiler => {
			const modifications = Array.from(compiler.modifiedFiles);
			if (modifications.length > 0) {
				expect(modifications).toContain(tempFilePath);
				watcher.close();
				done();
			}
		});

		watcher = compiler.watch({ aggregateTimeout: 50 }, () => {});

		setTimeout(() => {
			fs.appendFileSync(tempFilePath, "\nlet x = 'file modified';");
		}, 1000);
	});

	it("should not track modified files during initial watchRun", done => {
		const compiler = createSingleCompiler();
		let watchRunFinished;
		let watcher;
		compiler.hooks.watchRun.tap("ModifiedFilesTest", compiler => {
			const modifications = Array.from(compiler.modifiedFiles);
			watchRunFinished = new Promise(resolve => {
				expect(modifications).toHaveLength(0);
				resolve();
			});
		});
		watcher = compiler.watch({ aggregateTimeout: 50 }, () => {});

		watchRunFinished.then(() => {
			watcher.close();
			done();
		});
	});

	it("should include removed files when tracking modified files", done => {
		const compiler = createSingleCompiler();
		let watcher;

		compiler.hooks.watchRun.tap("ModifiedFilesTest", compiler => {
			const modifications = Array.from(compiler.modifiedFiles);
			console.log(modifications);
			if (compiler.removedFiles.size > 0) {
				expect(modifications).toHaveLength(1);
				expect(modifications).toContain(tempFilePath);
				watcher.close();
				done();
			}
		});

		watcher = compiler.watch({ aggregateTimeout: 50 }, () => {});

		setTimeout(() => {
			fs.unlinkSync(tempFilePath);
		}, 1000);
	});
});
