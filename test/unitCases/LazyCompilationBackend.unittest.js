"use strict";

const { EventEmitter } = require("events");
const createBackend = require("../../lib/hmr/lazyCompilationBackend");

/** @import { BackendApi } from "../../lib/hmr/LazyCompilationPlugin" */
/** @import { Server } from "http" */
/** @import { Socket } from "net" */

const PREFIX = "/lazy-compilation-using-";

// Runtime-agnostic timer control: patch global setTimeout/clearTimeout instead of
// jest's fake timers, which need `@sinonjs/fake-timers` (uninstallable on Bun).
/** @typedef {{ callback: () => void, delay: number, unref: () => EXPECTED_ANY }} FakeTimer */
/** @type {Set<FakeTimer>} */
let pendingTimers;
/** @type {typeof setTimeout} */
let realSetTimeout;
/** @type {typeof clearTimeout} */
let realClearTimeout;

const installTimers = () => {
	pendingTimers = new Set();
	realSetTimeout = global.setTimeout;
	realClearTimeout = global.clearTimeout;
	global.setTimeout = /** @type {EXPECTED_ANY} */ (
		(/** @type {() => void} */ callback, /** @type {number} */ delay) => {
			/** @type {FakeTimer} */
			const timer = { callback, delay, unref: () => timer };
			pendingTimers.add(timer);
			return timer;
		}
	);
	global.clearTimeout = /** @type {EXPECTED_ANY} */ (
		(/** @type {FakeTimer} */ timer) => {
			if (timer) pendingTimers.delete(timer);
		}
	);
};

const restoreTimers = () => {
	global.setTimeout = realSetTimeout;
	global.clearTimeout = realClearTimeout;
};

const timerCount = () => pendingTimers.size;

const advanceTimersByTime = (/** @type {number} */ ms) => {
	// Deleting the current entry during Set iteration is safe; callbacks here don't
	// schedule new timers, so iterating the live set needs no snapshot copy.
	for (const timer of pendingTimers) {
		if (timer.delay <= ms) {
			pendingTimers.delete(timer);
			timer.callback();
		}
	}
};

/** @returns {Server} a fake http.Server */
const makeServer = () => {
	const server = new EventEmitter();
	Object.assign(server, {
		address: () => ({ address: "127.0.0.1", family: "IPv4", port: 1234 }),
		close: (/** @type {() => void} */ cb) => cb && cb()
	});
	return /** @type {Server} */ (/** @type {unknown} */ (server));
};

/** @returns {Socket} a fake socket */
const makeSocket = () => {
	const socket = new EventEmitter();
	Object.assign(socket, {
		setNoDelay: () => {},
		// mirror http socket teardown: destroy triggers a close event
		destroy: () => socket.emit("close")
	});
	return /** @type {Socket} */ (/** @type {unknown} */ (socket));
};

/**
 * @param {string} id module identifier
 * @returns {import("../../lib/module/Module")} a fake module
 */
const makeModule = (id) =>
	/** @type {import("../../lib/module/Module")} */ (
		/** @type {unknown} */ ({ identifier: () => id })
	);

/**
 * @param {BackendApi} api backend api
 * @param {Server} server fake server
 * @param {string} url request url
 * @param {jest.Mock=} writeHead spy for the response status
 * @returns {Socket} the request socket
 */
const connect = (api, server, url, writeHead = jest.fn()) => {
	const socket = makeSocket();
	const req = { url, socket };
	const res = { writeHead, write() {}, end() {} };
	server.emit("connection", socket);
	server.emit("request", req, res);
	return socket;
};

describe("lazyCompilationBackend", () => {
	beforeEach(() => installTimers());

	afterEach(() => restoreTimers());

	/**
	 * @returns {{ api: BackendApi, server: Server, invalidate: jest.Mock }} harness
	 */
	const setup = () => {
		const server = makeServer();
		const invalidate = jest.fn();
		const compiler = /** @type {import("../../lib/Compiler")} */ (
			/** @type {unknown} */ ({
				getInfrastructureLogger: () => ({ log() {}, warn() {} }),
				watching: { invalidate }
			})
		);
		/** @type {BackendApi | undefined} */
		let api;
		createBackend({
			client: "client",
			server: () => server,
			listen: (/** @type {Server} */ s) => s.emit("listening")
		})(compiler, (err, result) => {
			if (err) throw err;
			api = result;
		});
		// listen fires "listening" synchronously, so api is set by now
		if (!api) throw new Error("backend did not initialize synchronously");
		return { api, server, invalidate };
	};

	it("activates a module while a client is connected and invalidates once", () => {
		const { api, server, invalidate } = setup();
		const mod = makeModule("mod-a");
		const { data: key } = api.module(mod);
		expect(api.module(mod).active).toBe(false);

		connect(api, server, PREFIX + key);
		expect(api.module(mod).active).toBe(true);
		expect(invalidate).toHaveBeenCalledTimes(1);

		// a second client for the same module doesn't re-invalidate
		connect(api, server, PREFIX + key);
		expect(invalidate).toHaveBeenCalledTimes(1);
	});

	it("keeps the module active until the last client disconnects, then drops it", () => {
		const { api, server } = setup();
		const mod = makeModule("mod-a");
		const { data: key } = api.module(mod);
		const s1 = connect(api, server, PREFIX + key);
		const s2 = connect(api, server, PREFIX + key);

		// first disconnect: still one client left after the idle delay
		s1.emit("close");
		advanceTimersByTime(120000);
		expect(api.module(mod).active).toBe(true);

		// last disconnect: module goes idle
		s2.emit("close");
		advanceTimersByTime(120000);
		expect(api.module(mod).active).toBe(false);
	});

	it("ignores keys that were never handed out by module()", () => {
		const { api, server, invalidate } = setup();
		const mod = makeModule("mod-a");
		const { data: key } = api.module(mod);

		// unknown keys are neither counted nor kept until the idle timer fires
		const s1 = connect(api, server, `${PREFIX}made-up@${key}x@other`);
		expect(invalidate).not.toHaveBeenCalled();
		expect(api.module(mod).active).toBe(false);
		s1.emit("close");
		expect(timerCount()).toBe(0);

		// a known key among unknown ones, repeated, is counted once
		const s2 = connect(api, server, `${PREFIX}made-up@${key}@${key}`);
		expect(invalidate).toHaveBeenCalledTimes(1);
		expect(api.module(mod).active).toBe(true);
		s2.emit("close");
		expect(timerCount()).toBe(1);
		advanceTimersByTime(120000);
		expect(api.module(mod).active).toBe(false);
	});

	it("rejects requests outside the lazy compilation prefix", () => {
		const { api, server, invalidate } = setup();
		const { data: key } = api.module(makeModule("mod-a"));
		const writeHead = jest.fn();

		const socket = connect(api, server, `/${key}`, writeHead);
		expect(writeHead).toHaveBeenCalledWith(404);
		expect(invalidate).not.toHaveBeenCalled();
		socket.emit("close");
		expect(timerCount()).toBe(0);
	});

	it.each([
		["no listen option", undefined, { host: "localhost", port: undefined }],
		["a port", 8080, { host: "localhost", port: 8080 }],
		["options without a host", { port: 8080 }, { host: "localhost", port: 8080 }],
		["an undefined host", { host: undefined }, { host: "localhost", port: undefined }],
		["an empty host", { host: "" }, { host: "localhost", port: undefined }],
		["an explicit host", { host: "0.0.0.0" }, { host: "0.0.0.0", port: undefined }],
		[
			"a host and a port",
			{ host: "0.0.0.0", port: 8080 },
			{ host: "0.0.0.0", port: 8080 }
		]
	])("listens on localhost by default given %s", (_name, listen, expected) => {
		const server = makeServer();
		const listenSpy = jest.fn();
		Object.assign(server, { listen: listenSpy });
		const compiler = /** @type {import("../../lib/Compiler")} */ (
			/** @type {unknown} */ ({ getInfrastructureLogger: () => ({}) })
		);
		createBackend({ client: "client", server: () => server, listen })(
			compiler,
			() => {}
		);
		expect(listenSpy).toHaveBeenCalledWith(expected);
	});

	it("does not schedule idle timers or hang after dispose", () => {
		const { api, server } = setup();
		const mod = makeModule("mod-a");
		const { data: key } = api.module(mod);
		connect(api, server, PREFIX + key);

		let disposed = false;
		api.dispose(() => {
			disposed = true;
		});
		expect(disposed).toBe(true);

		// dispose destroys sockets (emits close); with isClosing set, those must
		// not schedule new idle timers, so nothing is pending.
		expect(timerCount()).toBe(0);
	});

	it("clears a pending idle timer on dispose", () => {
		const { api, server } = setup();
		const mod = makeModule("mod-a");
		const { data: key } = api.module(mod);
		const s1 = connect(api, server, PREFIX + key);

		s1.emit("close");
		expect(timerCount()).toBe(1);

		api.dispose(() => {});
		expect(timerCount()).toBe(0);
	});
});

describe("lazyCompilationBackend on a shared server", () => {
	const http = require("http");

	/**
	 * @param {Server} server listening server
	 * @param {string} path request path
	 * @returns {Promise<{ status: number | undefined, type: string | undefined, body: string }>} the first chunk of the response
	 */
	const get = (server, path) =>
		new Promise((resolve, reject) => {
			const { port } = /** @type {import("net").AddressInfo} */ (
				server.address()
			);
			const req = http.get({ host: "127.0.0.1", port, path }, (res) => {
				res.once("data", (chunk) => {
					resolve({
						status: res.statusCode,
						type: res.headers["content-type"],
						body: String(chunk)
					});
					res.destroy();
				});
			});
			req.on("error", reject);
		});

	/**
	 * @param {string} client the client request a proxy module loads
	 * @param {string} urlBase the url clients reach the backend at
	 * @returns {string} the backend's url prefix on the server
	 */
	const prefixOf = (client, urlBase) => {
		const url = decodeURIComponent(client.slice("client?".length));
		expect(url).toMatch(/\/lazy-compilation-using-\d+-$/);
		expect(url.startsWith(`${urlBase}/`)).toBe(true);
		return url.slice(urlBase.length);
	};

	/**
	 * @param {Server} server a shared server
	 * @param {{ urlBase?: string, invalidate?: () => void }=} options the url clients reach the backend at, and the watcher it invalidates
	 * @returns {{ started: () => import("../../lib/hmr/LazyCompilationPlugin").BackendApi | undefined }} what the backend handed over so far
	 */
	const startShared = (server, { urlBase, invalidate } = {}) => {
		/** @type {import("../../lib/hmr/LazyCompilationPlugin").BackendApi | undefined} */
		let api;
		createBackend({ client: "client", server, urlBase })(
			/** @type {import("../../lib/Compiler")} */ (
				/** @type {unknown} */ ({
					getInfrastructureLogger: () => ({ log() {}, warn() {} }),
					watching: { invalidate: invalidate || (() => {}) }
				})
			),
			(err, result) => {
				if (err) throw err;
				api = result;
			}
		);
		return { started: () => api };
	};

	/**
	 * @param {import("../../lib/hmr/LazyCompilationPlugin").BackendApi} api a started backend
	 * @returns {Promise<void>} settles once it is disposed
	 */
	const dispose = (api) =>
		new Promise((resolve, reject) => {
			api.dispose((err) => (err ? reject(err) : resolve()));
		});

	/**
	 * @param {(server: Server, appCalls: () => number) => Promise<void>} fn the test body
	 * @returns {Promise<void>} settles once the server is closed again
	 */
	const withServer = async (fn) => {
		let calls = 0;
		/** @type {Server} */
		const server = http.createServer((req, res) => {
			calls++;
			res.end("app");
		});
		await new Promise((resolve) => {
			server.listen(0, "127.0.0.1", () => resolve(undefined));
		});
		try {
			await fn(server, () => calls);
		} finally {
			if (server.closeAllConnections) server.closeAllConnections();
			await new Promise((resolve) => {
				server.close(() => resolve(undefined));
			});
		}
	};

	/**
	 * @param {Server} server a listening server
	 * @returns {string} the url clients reach it at
	 */
	const urlOf = (server) =>
		`http://127.0.0.1:${
			/** @type {import("net").AddressInfo} */ (server.address()).port
		}`;

	it("serves lazy urls on it, hands it every other url and leaves it open", () =>
		withServer(async (server, appCalls) => {
			const api =
				/** @type {import("../../lib/hmr/LazyCompilationPlugin").BackendApi} */ (
					startShared(server).started()
				);
			const { client, data: key } = api.module(makeModule("mod-a"));
			const prefix = prefixOf(client, urlOf(server));

			expect(await get(server, prefix + key)).toEqual(
				expect.objectContaining({ status: 200, type: "text/event-stream" })
			);
			expect(await get(server, "/other")).toEqual(
				expect.objectContaining({ status: 200, body: "app" })
			);
			expect(appCalls()).toBe(1);

			await dispose(api);
			expect(server.listening).toBe(true);
			expect(server.listenerCount("request")).toBe(1);
			expect(await get(server, prefix + key)).toEqual(
				expect.objectContaining({ body: "app" })
			);
		}));

	it.each([
		["first to last", [0, 1]],
		["last to first", [1, 0]]
	])(
		"routes each backend's urls to it and restores the server disposed %s",
		(_name, order) =>
			withServer(async (server, appCalls) => {
				const invalidated = [jest.fn(), jest.fn()];
				const apis = invalidated.map(
					(invalidate) =>
						/** @type {import("../../lib/hmr/LazyCompilationPlugin").BackendApi} */ (
							startShared(server, { invalidate }).started()
						)
				);
				const modules = apis.map((api, index) =>
					api.module(makeModule(`mod-${index}`))
				);
				const prefixes = modules.map(({ client }) =>
					prefixOf(client, urlOf(server))
				);
				expect(prefixes[0]).not.toBe(prefixes[1]);

				await get(server, prefixes[0] + modules[0].data);
				expect(invalidated[0]).toHaveBeenCalledTimes(1);
				expect(invalidated[1]).not.toHaveBeenCalled();
				await get(server, prefixes[1] + modules[1].data);
				expect(invalidated[1]).toHaveBeenCalledTimes(1);

				await dispose(apis[order[0]]);
				expect(await get(server, "/other")).toEqual(
					expect.objectContaining({ body: "app" })
				);
				expect(appCalls()).toBe(1);
				expect(
					await get(server, prefixes[order[1]] + modules[order[1]].data)
				).toEqual(expect.objectContaining({ type: "text/event-stream" }));

				await dispose(apis[order[1]]);
				expect(server.listenerCount("request")).toBe(1);
				expect(await get(server, "/other")).toEqual(
					expect.objectContaining({ body: "app" })
				);
				expect(appCalls()).toBe(2);
			})
	);

	it("starts at once on a server not yet listening when given a urlBase", async () => {
		const server = http.createServer();
		const api =
			/** @type {import("../../lib/hmr/LazyCompilationPlugin").BackendApi} */ (
				startShared(server, { urlBase: "https://localhost:8080" }).started()
			);
		prefixOf(api.module(makeModule("mod-a")).client, "https://localhost:8080");
		await dispose(api);
		expect(server.listenerCount("request")).toBe(0);
	});

	it("waits for a server not yet listening without a urlBase", () => {
		const server = new EventEmitter();
		Object.assign(server, {
			listening: false,
			listen() {},
			address: () => ({ address: "::", family: "IPv6", port: 4321 })
		});
		const { started } = startShared(
			/** @type {Server} */ (/** @type {unknown} */ (server))
		);
		expect(started()).toBeUndefined();
		server.emit("listening");
		const api =
			/** @type {import("../../lib/hmr/LazyCompilationPlugin").BackendApi} */ (
				started()
			);
		prefixOf(api.module(makeModule("mod-a")).client, "http://localhost:4321");
	});

	it("reads https from a shared https server", async () => {
		const server = require("https").createServer();
		await new Promise((resolve) => {
			server.listen(0, "127.0.0.1", () => resolve(undefined));
		});
		try {
			const api =
				/** @type {import("../../lib/hmr/LazyCompilationPlugin").BackendApi} */ (
					startShared(server).started()
				);
			const { port } = /** @type {import("net").AddressInfo} */ (
				server.address()
			);
			prefixOf(
				api.module(makeModule("mod-a")).client,
				`https://127.0.0.1:${port}`
			);
		} finally {
			await new Promise((resolve) => {
				server.close(() => resolve(undefined));
			});
		}
	});
});
