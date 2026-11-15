"use strict";

const path = require("path");
const fs = require("graceful-fs");

const webpack = require("../..");

const fixturePath = path.join(
	__dirname,
	"..",
	"js",
	"WatchManagedPathDuringBuild"
);

/**
 * @param {string} file path relative to the fixture
 * @param {string} content content
 */
const write = (file, content) => {
	const target = path.join(fixturePath, file);
	fs.mkdirSync(path.dirname(target), { recursive: true });
	fs.writeFileSync(target, content);
};

describe("WatchManagedPathDuringBuild", () => {
	if (process.env.NO_WATCH_TESTS) {
		// eslint-disable-next-line jest/no-disabled-tests
		it.skip("long running tests excluded", () => {});

		return;
	}

	jest.setTimeout(20000);

	beforeEach(() => {
		fs.rmSync(fixturePath, { recursive: true, force: true });
		write("index.js", 'export { bar } from "foo";\n');
		write("node_modules/bar/index.js", 'export const bar = "bar";\n');
		write("node_modules/bar/package.json", '{"name":"bar","version":"0"}');
		write("node_modules/foo/index.js", 'export { bar } from "bar";\n');
		write("node_modules/foo/package.json", '{"name":"foo","version":"0"}');
	});

	/** @type {import("../../").Watching | undefined} */
	let watching;

	afterEach((done) => {
		// closed here too, so a failing test cannot leave it running
		const cleanup = () => {
			fs.rmSync(fixturePath, { recursive: true, force: true });
			done();
		};
		if (watching) watching.close(cleanup);
		else cleanup();
		watching = undefined;
	});

	for (const cacheUnaffected of [false, true]) {
		it(`should resolve an inner node_modules that appears during a build${
			cacheUnaffected ? " with cacheUnaffected" : ""
		}`, (done) => {
			const compiler = webpack({
				mode: "development",
				context: fixturePath,
				entry: "./index.js",
				devtool: false,
				output: {
					path: path.join(fixturePath, "dist"),
					library: { type: "commonjs2" }
				},
				cache: { type: "memory" },
				experiments: { cacheUnaffected },
				snapshot: {
					managedPaths: [path.join(fixturePath, "node_modules")]
				},
				module: { unsafeCache: false }
			});
			let builds = 0;
			// the second build resolves from the cached state of the first, in which
			// the inner node_modules is missing; it appears while that build runs
			compiler.hooks.compile.tap("Test", () => {
				if (builds === 1) {
					write(
						"node_modules/foo/node_modules/bar/index.js",
						'export const bar = "inner-bar";\n'
					);
					write(
						"node_modules/foo/node_modules/bar/package.json",
						'{"name":"bar","version":"1"}'
					);
				}
			});
			// read as text: jest keeps its own registry of required modules
			const resolvesInner = () =>
				fs
					.readFileSync(path.join(fixturePath, "dist", "main.js"), "utf8")
					.includes("inner-bar");
			watching = compiler.watch({ aggregateTimeout: 100 }, (err) => {
				if (err) return done(err);
				builds++;
				if (builds === 1) {
					setTimeout(() => write("index.js", 'export { bar } from "foo";\n//\n'), 300);
					return;
				}
				if (resolvesInner()) done();
			});
		});
	}
});
