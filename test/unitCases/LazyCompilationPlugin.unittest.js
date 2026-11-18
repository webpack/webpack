"use strict";

const { EventEmitter } = require("events");
const webpack = require("webpack");

const { LazyCompilationPlugin } = webpack.hmr;

/** @typedef {import("../../lib/hmr/LazyCompilationPlugin").LazyCompilationBackendOptions} BackendOptions */
/**
 * @param {(transport: BackendOptions) => Promise<EXPECTED_ANY>} transport what the tap returns for the built-in backend's options
 * @returns {{ compiler: import("webpack").Compiler, started: Promise<void> }} the compiler, and a promise settling once the backend started or failed
 */
const startBackend = (transport) => {
	const compiler = webpack({
		mode: "development",
		context: __dirname,
		entry: "./entry-is-never-built",
		experiments: { lazyCompilation: true },
		infrastructureLogging: { level: "none" }
	});
	LazyCompilationPlugin.getCompilerHooks(compiler).transport.tapPromise(
		"test",
		(value) => transport(/** @type {BackendOptions} */ (value))
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

	it("starts a backend function a tap returns in place of the options", async () => {
		const api = {
			dispose: jest.fn((/** @type {() => void} */ callback) => callback()),
			module: () => ({ client: "./ws-client.js?ws://localhost:1", data: "", active: false })
		};
		const ws = jest.fn(async () => api);
		const { compiler, started } = startBackend(async () => ws);
		await started;
		expect(ws).toHaveBeenCalledWith(compiler, expect.any(Function));
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
		expect(api.dispose).toHaveBeenCalledTimes(1);
	});

	it("hands a custom backend function to the taps", async () => {
		/** @type {EXPECTED_ANY} */
		const custom = async () => ({
			dispose: (/** @type {() => void} */ callback) => callback(),
			module: () => ({ client: "", data: "", active: false })
		});
		const compiler = webpack({
			mode: "development",
			context: __dirname,
			entry: "./entry-is-never-built",
			experiments: { lazyCompilation: { backend: custom } },
			infrastructureLogging: { level: "none" }
		});
		/** @type {unknown} */
		let received;
		LazyCompilationPlugin.getCompilerHooks(compiler).transport.tap(
			"test",
			(transport) => {
				received = transport;
				return transport;
			}
		);
		await new Promise((resolve, reject) => {
			compiler.hooks.beforeCompile.callAsync(
				/** @type {EXPECTED_ANY} */ ({}),
				(err) => (err ? reject(err) : resolve(undefined))
			);
		});
		expect(received).toBe(custom);
	});
});
