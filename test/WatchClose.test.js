"use strict";

const path = require("path");

const webpack = require("../");

describe("WatchClose", () => {
	jest.setTimeout(5000);

	describe("multiple calls watcher", () => {
		const fixturePath = path.join(__dirname, "fixtures");
		const filePath = path.join(fixturePath, "a.js");

		let compiler;
		let watcher;

		beforeEach(() => {
			compiler = webpack({
				mode: "development",
				entry: filePath,
				output: {
					path: fixturePath,
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

		it("each callback should be called", async done => {
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

			done();
		});
	});
});
