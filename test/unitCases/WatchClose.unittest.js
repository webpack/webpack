"use strict";

require("../helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const testDirectory = path.resolve(__dirname, "..");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");

expectNoDeprecations();

describe("WatchClose", () => {
	describe("multiple calls watcher", () => {
		const fixturePath = path.join(testDirectory, "fixtures");
		const outputPath = path.join(testDirectory, "js/WatchClose");
		const filePath = path.join(fixturePath, "a.js");

		/** @type {import("../../").Compiler | null} */
		let compiler;
		/** @type {import("../../").Watching} */
		let watcher;

		beforeEach(() => {
			const webpack = require("../../");

			compiler = webpack({
				mode: "development",
				entry: filePath,
				output: {
					path: outputPath,
					filename: "bundle.js"
				}
			});
			watcher = /** @type {import("../../").Watching} */ (
				/** @type {import("../../").Compiler} */ (compiler).watch(
					{ poll: 300 },
					() => {}
				)
			);
		});

		afterEach(() => {
			/** @type {{ close: () => void }} */ (
				/** @type {unknown} */ (watcher)
			).close();
			compiler = null;
		});

		/**
		 * @param {import("../../").Watching} watcher watcher
		 * @param {(err?: null | Error) => void} callback callback
		 * @returns {Promise<void>}
		 */
		function close(watcher, callback) {
			return new Promise((res) => {
				const onClose = () => {
					callback();
					res();
				};
				watcher.close(onClose);
			});
		}

		it("each callback should be called", async () => {
			let num = 0;

			await Promise.all([
				close(watcher, () => (num += 1)),
				close(watcher, () => (num += 10))
			]);
			await Promise.all([
				close(watcher, () => (num += 100)),
				close(watcher, () => (num += 1000))
			]);

			expect(num).toBe(1111);
		});
	});

	describe("watching again after close", () => {
		const fixturePath = path.join(
			testDirectory,
			"fixtures",
			`temp-watch-close-${Date.now()}`
		);
		const filePath = path.join(fixturePath, "file.js");

		beforeAll(() => {
			fs.mkdirSync(fixturePath, { recursive: true });
			fs.writeFileSync(filePath, "module.exports = 'before';", "utf8");
		});

		afterAll(() => {
			fs.unlinkSync(filePath);
			fs.rmdirSync(fixturePath);
		});

		it("should read a file edited while closed", async () => {
			const webpack = require("../../");

			const outputPath = path.join(testDirectory, "js/WatchCloseAgain");
			const compiler = webpack({
				mode: "development",
				entry: filePath,
				output: { path: outputPath, filename: "bundle.js" }
			});
			/**
			 * @returns {Promise<string>} the emitted bundle of the first build
			 */
			const build = () =>
				new Promise((resolve, reject) => {
					const watching = /** @type {import("../../").Watching} */ (
						compiler.watch({}, (err) => {
							if (err) return reject(err);
							watching.close(() =>
								resolve(
									fs.readFileSync(path.join(outputPath, "bundle.js"), "utf8")
								)
							);
						})
					);
				});

			expect(await build()).toContain("before");
			fs.writeFileSync(filePath, "module.exports = 'after';", "utf8");
			expect(await build()).toContain("after");
		});
	});
});
