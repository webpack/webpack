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

	it("disposes a backend that starts after the compiler closed", async () => {
		const server = new EventEmitter();
		const close = jest.fn((/** @type {() => void} */ callback) => callback());
		Object.assign(server, {
			address: () => ({ address: "127.0.0.1", family: "IPv4", port: 1234 }),
			close
		});
		/** @type {() => void} */
		let release = () => {};
		const { compiler, started } = startBackend(
			(options) =>
				new Promise((resolve) => {
					release = () =>
						resolve({
							...options,
							server: () => /** @type {EXPECTED_ANY} */ (server),
							listen: (s) => s.emit("listening")
						});
				})
		);
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
		release();
		await expect(started).rejects.toThrow(
			"Lazy compilation backend started after the compiler was closed"
		);
		expect(close).toHaveBeenCalledTimes(1);
	});
});
