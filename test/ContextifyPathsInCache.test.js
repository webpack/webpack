"use strict";

const path = require("path");
const { promisify } = require("util");
const child_process = require("child_process");
const fs = require("fs");
const rimraf = require("rimraf");

const linkAsync = promisify(fs.symlink);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);
const outputDirectory = path.resolve(__dirname, "js/contextifyOutput");
const inputDirectory1 = path.resolve(__dirname, "js/contextifyInput1");
const inputDirectory2 = path.resolve(__dirname, "js/contextifyInput2/repo");

const exec = (n, dir) => {
	return new Promise((resolve, reject) => {
		const p = child_process.fork(path.resolve(dir, "run.js"), [n], {
			stdio: ["ignore", "pipe", "inherit", "ipc"]
		});
		const chunks = [];
		p.stdout.on("data", chunk => chunks.push(chunk));
		p.once("exit", code => {
			const stdout = Buffer.concat(chunks).toString("utf-8");
			if (code === 0) {
				resolve(stdout);
			} else {
				reject(new Error(`Code ${code}: ${stdout}`));
			}
		});
		p.once("error", err => reject(err));
	});
};

const nextExec = (() => {
	let i = 0;
	return () => i++;
})();

const user1Exec = async () => {
	const n = nextExec();
	return exec(n, inputDirectory1);
};

const user2Exec = async () => {
	const n = nextExec();
	return exec(n, inputDirectory2);
};

describe("Contextify cache paths", () => {
	const writeValueAsync = value =>
		Promise.all([
			writeFileAsync(
				path.resolve(inputDirectory1, "a.js"),
				`module.exports = { b: require('./b'), a: ${value} };`
			),
			writeFileAsync(
				path.resolve(inputDirectory2, "a.js"),
				`module.exports = { b: require('./b'), a: ${value} };`
			)
		]);

	const shareCache = () =>
		linkAsync(
			path.resolve(inputDirectory1, ".cache"),
			path.resolve(inputDirectory2, ".cache")
		);

	beforeEach(done => rimraf(outputDirectory, done));
	beforeEach(done => rimraf(inputDirectory1, done));
	beforeEach(done => rimraf(inputDirectory2, done));
	beforeEach(done => fs.mkdir(inputDirectory2, { recursive: true }, done));
	beforeEach(done => {
		fs.mkdir(inputDirectory1, { recursive: true }, err => {
			if (err) {
				done(err);
				return;
			}

			Promise.all([
				copyFileAsync(
					path.resolve(__dirname, "./fixtures/contextifyCache/b.js"),
					path.resolve(inputDirectory1, "b.js")
				),
				copyFileAsync(
					path.resolve(__dirname, "./fixtures/contextifyCache/a.js"),
					path.resolve(inputDirectory1, "a.js")
				),
				copyFileAsync(
					path.resolve(__dirname, "./fixtures/contextifyCache/run1.js"),
					path.resolve(inputDirectory1, "run.js")
				),
				copyFileAsync(
					path.resolve(__dirname, "./fixtures/contextifyCache/b.js"),
					path.resolve(inputDirectory2, "b.js")
				),
				copyFileAsync(
					path.resolve(__dirname, "./fixtures/contextifyCache/a.js"),
					path.resolve(inputDirectory2, "a.js")
				),
				copyFileAsync(
					path.resolve(__dirname, "./fixtures/contextifyCache/run2.js"),
					path.resolve(inputDirectory2, "run.js")
				)
			])
				.then(() => done())
				.catch(err => done(err));
		});
	});

	it("should use cache for different context locations", async () => {
		await writeValueAsync(1);

		await user1Exec(); // 0 run
		await shareCache();
		await user2Exec(); // 1 run

		await writeValueAsync("Date.now()");

		await user1Exec(); // 2 run
		await writeValueAsync("Date.now() - 1000 * 60 * 60 * 24");
		await user1Exec(); // 3 run
		await user2Exec(); // 4 run

		const results = Array.from({ length: 5 }).map((_, i) =>
			require(`./js/contextifyOutput/${i}/main.js`)
		);

		for (const r of results) {
			expect(typeof r.a).toBe("number");
			expect(typeof r.b).toBe("number");
		}

		// 0 -> 1 should stay cached
		/* TODO */
		// 1 -> 2 should restore only b from cache
		/* TODO */
		// 2 -> 3 should restore only b from cache
		/* TODO */
		// 3 -> 4 should stay cached for user 2
		/* TODO */
	}, 200000);
});
