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

	it("starts the backend a tap sets, with the options the taps settled on", async () => {
		const api = {
			dispose: jest.fn((/** @type {() => void} */ callback) => callback()),
			module: () => ({ client: "./ws-client.js?ws://localhost:1", data: "", active: false })
		};
		const ws = jest.fn(async () => api);
		const { compiler, started } = startBackend(async (transport) => ({
			...transport,
			backend: ws,
			listen: { port: 8081 }
		}));
		await started;
		expect(ws).toHaveBeenCalledWith(
			compiler,
			expect.any(Function),
			expect.objectContaining({ backend: ws, listen: { port: 8081 } })
		);
		await new Promise((resolve, reject) => {
			compiler.close((err) => (err ? reject(err) : resolve(undefined)));
		});
		expect(api.dispose).toHaveBeenCalledTimes(1);
	});

	it("hands a custom backend to the taps and their options to it", async () => {
		/** @type {unknown[][]} */
		const calls = [];
		// A plain function: the schema checks for a `Function` of this realm.
		const custom = async (/** @type {unknown[]} */ ...args) => {
			calls.push(args);
			return {
				dispose: (/** @type {() => void} */ callback) => callback(),
				module: () => ({ client: "", data: "", active: false })
			};
		};
		const compiler = webpack({
			mode: "development",
			context: __dirname,
			entry: "./entry-is-never-built",
			experiments: {
				lazyCompilation: { backend: /** @type {EXPECTED_ANY} */ (custom) }
			},
			infrastructureLogging: { level: "none" }
		});
		/** @type {unknown} */
		let received;
		LazyCompilationPlugin.getCompilerHooks(compiler).transport.tap(
			"test",
			(transport) => {
				received = transport;
				return { ...transport, urlBase: "https://localhost:8080" };
			}
		);
		await new Promise((resolve, reject) => {
			compiler.hooks.beforeCompile.callAsync(
				/** @type {EXPECTED_ANY} */ ({}),
				(err) => (err ? reject(err) : resolve(undefined))
			);
		});
		expect(received).toEqual({
			client: expect.stringMatching(/lazy-compilation-web\.js$/),
			backend: custom
		});
		expect(calls).toEqual([
			[
				compiler,
				expect.any(Function),
				expect.objectContaining({ urlBase: "https://localhost:8080" })
			]
		]);
	});

	it("starts the backend through the hook again once watching closed", async () => {
		const disposed = jest.fn((/** @type {() => void} */ callback) => callback());
		const transport = jest.fn(async (/** @type {BackendOptions} */ value) => ({
			...value,
			backend: async () => ({
				dispose: disposed,
				module: () => ({ client: "", data: "", active: false })
			})
		}));
		const { compiler, started } = startBackend(transport);
		await started;
		compiler.hooks.watchClose.call();
		expect(disposed).toHaveBeenCalledTimes(1);
		await new Promise((resolve, reject) => {
			compiler.hooks.beforeCompile.callAsync(
				/** @type {EXPECTED_ANY} */ ({}),
				(err) => (err ? reject(err) : resolve(undefined))
			);
		});
		expect(transport).toHaveBeenCalledTimes(2);
	});

	it.each([undefined, new Error("backend close failed")])(
		"waits for a pending backend disposal and reports %s on shutdown",
		async (error) => {
			/** @type {((error?: Error) => void) | undefined} */
			let finishDispose;
			const dispose = jest.fn((/** @type {(error?: Error) => void} */ done) => {
				finishDispose = done;
			});
			const { compiler, started } = startBackend(async (transport) => ({
				...transport,
				backend: async () => ({
					dispose,
					module: () => ({ client: "", data: "", active: false })
				})
			}));
			await started;
			compiler.hooks.watchClose.call();
			let closed = false;
			/** @type {Promise<Error | null | undefined>} */
			const closing = new Promise((resolve) => {
				compiler.close((result) => {
					closed = true;
					resolve(result);
				});
			});
			await new Promise((resolve) => setImmediate(resolve));
			try {
				expect(closed).toBe(false);
				expect(dispose).toHaveBeenCalledTimes(1);
			} finally {
				/** @type {(error?: Error) => void} */ (finishDispose)(error);
			}
			expect(await closing).toBe(error || null);
		}
	);

	it("reports an error thrown while disposing a watched backend", async () => {
		const error = new Error("backend disposal threw");
		const { compiler, started } = startBackend(async (transport) => ({
			...transport,
			backend: async () => ({
				dispose: () => {
					throw error;
				},
				module: () => ({ client: "", data: "", active: false })
			})
		}));
		await started;
		compiler.hooks.watchClose.call();
		/** @type {Promise<Error | null | undefined>} */
		const closing = new Promise((resolve) => compiler.close(resolve));
		expect(await closing).toBe(error);
	});

	it.each([undefined, new Error("backend close failed")])(
		"waits for a pending backend disposal and reports %s before restarting",
		async (error) => {
			/** @type {((error?: Error) => void) | undefined} */
			let finishDispose;
			const transport = jest.fn(async (/** @type {BackendOptions} */ options) => ({
				...options,
				backend: async () => ({
					dispose: (/** @type {(error?: Error) => void} */ done) => {
						finishDispose = done;
					},
					module: () => ({ client: "", data: "", active: false })
				})
			}));
			const { compiler, started } = startBackend(transport);
			await started;
			compiler.hooks.watchClose.call();
			/** @type {Promise<Error | null | undefined>} */
			const restarting = new Promise((resolve) => {
				compiler.hooks.beforeCompile.callAsync(compiler.newCompilationParams(), resolve);
			});
			await new Promise((resolve) => setImmediate(resolve));
			try {
				expect(transport).toHaveBeenCalledTimes(1);
			} finally {
				/** @type {(error?: Error) => void} */ (finishDispose)(error);
			}
			expect(await restarting).toBe(error);
			expect(transport).toHaveBeenCalledTimes(error ? 1 : 2);
		}
	);
});
