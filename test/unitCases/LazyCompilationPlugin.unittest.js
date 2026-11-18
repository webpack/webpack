"use strict";

const { EventEmitter } = require("events");
const webpack = require("webpack");

const { LazyCompilationPlugin } = webpack.experiments.hmr;

/**
 * @param {(options: import("../../lib/hmr/LazyCompilationPlugin").LazyCompilationBackendOptions) => Promise<import("../../lib/hmr/LazyCompilationPlugin").LazyCompilationBackendOptions>} backendOptions what the tap returns
 * @returns {{ compiler: import("webpack").Compiler, started: Promise<void> }} the compiler, and a promise settling once the backend started or failed
 */
const startBackend = (backendOptions) => {
	const compiler = webpack({
		mode: "development",
		context: __dirname,
		entry: "./entry-is-never-built",
		experiments: { lazyCompilation: true },
		infrastructureLogging: { level: "none" }
	});
	LazyCompilationPlugin.getCompilerHooks(compiler).backendOptions.tapPromise(
		"test",
		backendOptions
	);
	/** @type {Promise<void>} */
	const started = new Promise((resolve, reject) => {
		compiler.hooks.beforeCompile.callAsync(
			/** @type {EXPECTED_ANY} */ ({}),
			(err) => (err ? reject(err) : resolve())
		);
	});
	return { compiler, started };
};

describe("LazyCompilationPlugin.getCompilerHooks", () => {
	it("returns the same hooks for a compiler", () => {
		const compiler = webpack({ infrastructureLogging: { level: "none" } });
		expect(LazyCompilationPlugin.getCompilerHooks(compiler)).toBe(
			LazyCompilationPlugin.getCompilerHooks(compiler)
		);
	});

	it("starts the built-in backend with the options its taps return", async () => {
		const server = new EventEmitter();
		Object.assign(server, {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 1234 })
		});
		const listen = jest.fn((/** @type {EventEmitter} */ s) =>
			s.emit("listening")
		);
		/** @type {import("../../lib/hmr/LazyCompilationPlugin").LazyCompilationBackendOptions | undefined} */
		let received;
		await startBackend(async (options) => {
			received = options;
			return {
				...options,
				server: () => /** @type {EXPECTED_ANY} */ (server),
				listen
			};
		}).started;
		expect(received).toEqual({
			client: expect.stringMatching(/lazy-compilation-web\.js$/)
		});
		expect(listen).toHaveBeenCalledWith(server);
	});

	it("fails the compile when a tap fails, and still closes", async () => {
		const { compiler, started } = startBackend(async () => {
			throw new Error("no server");
		});
		await expect(started).rejects.toThrow("no server");
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
	});

	it("fails the compile when the backend throws after a tap", async () => {
		const { started } = startBackend(async (options) => ({
			...options,
			server: () => {
				throw new Error("no server");
			}
		}));
		await expect(started).rejects.toThrow("no server");
	});

	it("does not start the backend when a tap finishes after the compiler closed", async () => {
		const listen = jest.fn();
		/** @type {() => void} */
		let release = () => {};
		const { compiler, started } = startBackend(
			(options) =>
				new Promise((resolve) => {
					release = () => resolve({ ...options, listen });
				})
		);
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
		release();
		await expect(started).rejects.toThrow(
			"Lazy compilation backend started after the compiler was closed"
		);
		expect(listen).not.toHaveBeenCalled();
	});

	it("stops compile() before make when a tap finishes after the compiler closed", async () => {
		const compiler = webpack({
			mode: "development",
			context: __dirname,
			entry: "./entry-is-never-built",
			experiments: { lazyCompilation: true },
			infrastructureLogging: { level: "none" }
		});
		const make = jest.fn();
		compiler.hooks.make.tap("test", make);
		/** @type {() => void} */
		let release = () => {};
		LazyCompilationPlugin.getCompilerHooks(compiler).backendOptions.tapPromise(
			"test",
			(options) =>
				new Promise((resolve) => {
					release = () => resolve(options);
				})
		);
		/** @type {Promise<void>} */
		const compiled = new Promise((resolve, reject) => {
			compiler.compile((err) => (err ? reject(err) : resolve()));
		});
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
		release();
		await expect(compiled).rejects.toThrow(
			"Lazy compilation backend started after the compiler was closed"
		);
		expect(make).not.toHaveBeenCalled();
	});

	it("disposes a custom backend that starts after the compiler closed", async () => {
		/** @type {((err: Error | null, api?: EXPECTED_ANY) => void) | undefined} */
		let finish;
		const compiler = webpack({
			mode: "development",
			context: __dirname,
			entry: "./entry-is-never-built",
			experiments: {
				lazyCompilation: {
					backend: (_compiler, callback) => {
						finish = callback;
					}
				}
			},
			infrastructureLogging: { level: "none" }
		});
		const make = jest.fn();
		compiler.hooks.make.tap("test", make);
		/** @type {Promise<void>} */
		const started = new Promise((resolve, reject) => {
			compiler.compile((err) => (err ? reject(err) : resolve()));
		});
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
		const dispose = jest.fn((/** @type {() => void} */ callback) => callback());
		/** @type {NonNullable<typeof finish>} */ (finish)(null, {
			dispose,
			module: () => ({ client: "", data: "", active: false })
		});
		await expect(started).rejects.toThrow(
			"Lazy compilation backend started after the compiler was closed"
		);
		expect(dispose).toHaveBeenCalledTimes(1);
		expect(make).not.toHaveBeenCalled();
	});
});
