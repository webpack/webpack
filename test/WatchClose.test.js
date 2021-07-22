"use strict";

require("./helpers/warmup-webpack");

const path = require("path");

describe("WatchClose", () => {
	jest.setTimeout(5000);

	describe("multiple calls watcher", () => {
		const fixturePath = path.join(__dirname, "fixtures");
		const outputPath = path.join(__dirname, "js/WatchClose");
		const filePath = path.join(fixturePath, "a.js");

		let compiler;
		let watcher;

		beforeEach(() => {
			const webpack = require("../");
			compiler = webpack({
				mode: "development",
				entry: filePath,
				output: {
					path: outputPath,
					filename: "bundle.js"
				}
			});
			watcher = compiler.watch({ poll: 300 }, () => {});
		});

		afterEach(() => {
			watcher.close();
			compiler = null;
		});

		function close(watcher, callback) {
			return new Promise(res => {
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
});
