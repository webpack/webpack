"use strict";

const path = require("path");

const webpack = require("../");

describe("WatchClose", () => {
	jest.setTimeout(5000);

	describe("multiple calls watcher", () => {
		const fixturePath = path.join(__dirname, "fixtures");
		const filePath = path.join(fixturePath, "a.js");

		let compiler = webpack({
			mode: "development",
			entry: filePath,
			output: {
				path: fixturePath,
				filename: "bundle.js"
			}
		});
		const watcher = compiler.watch({
			poll: 300
		});

		afterAll(() => {
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

			await close(watcher, () => {
				num += 1;
			});
			expect(num).toBe(1);
			await close(watcher, () => {
				num += 1;
			});

			expect(num).toBe(2);

			done();
		});

		it("each callback should be called", async done => {
			let num = 0;

			await new Promise(res => {
				watcher.close(() => {
					if (num === 1) {
						res();
					} else {
						num += 1;
					}
				});
				watcher.close(() => {
					if (num === 1) {
						res();
					} else {
						num += 1;
					}
				});
			});

			expect(num).toBe(1);

			done();
		});
	});
});
