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

describe("RemovedFiles", () => {
	if (process.env.NO_WATCH_TESTS) {
		it.skip("watch tests excluded", () => {});
		return;
	}

	jest.setTimeout(20000);

	function cleanup() {
		rimraf.sync(tempFolderPath);
	}

	beforeAll(() => {
		cleanup();
		fs.mkdirSync(tempFolderPath);
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
	});
	afterAll(done => {
		cleanup();
		done();
	});

	it("should track removed files when they've been deleted in watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;
		function handleError(err) {
			if (err) done(err);
		}
		setTimeout(() => {
			fs.unlinkSync(tempFilePath, handleError);
		}, 2000);
		compiler.hooks.watchRun.tap("RemovedFilesTest", (compiler, err) => {
			if (err) {
				done(err);
			}
			const removals = Array.from(compiler.removedFiles);
			if (removals.length > 0) {
				setTimeout(() => {
					expect(removals).toContain(tempFilePath);
					watcher.close();
					done();
				}, 100);
			}
		});

		watcher = compiler.watch(
			{
				aggregateTimeout: 50
			},
			(err, stats) => {}
		);
	});

	it("should not track removed files when they have not been deleted in watchRun", done => {
		const compiler = createSingleCompiler();
		let watcher;
		compiler.hooks.watchRun.tap("RemovedFilesTest", (compiler, err) => {
			if (err) {
				done(err);
			}
			expect(Array.from(compiler.removedFiles)).toHaveLength(0);
			done();
			watcher.close();
		});

		watcher = compiler.watch(
			{
				aggregateTimeout: 50
			},
			(err, stats) => {}
		);
	});

	it("should not track removed files when files have been modified", done => {
		const compiler = createSingleCompiler();
		let watcher;
		function handleError(err) {
			if (err) done(err);
		}
		let updateFile = () => {
			fs.writeFile(tempFile2Path, "hello world", "utf-8", handleError);
		};
		updateFile();
		compiler.hooks.watchRun.tap("RemovedFilesTest", (compiler, err) => {
			handleError(err);
			setTimeout(() => {
				expect(Array.from(compiler.removedFiles)).toHaveLength(0);
				watcher.close();
				done();
			}, 500);
			watcher.close();
		});

		watcher = compiler.watch(
			{
				aggregateTimeout: 50
			},
			(err, stats) => {}
		);
	});
});
