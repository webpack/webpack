"use strict";

const { EventEmitter } = require("events");
const createBackend = require("../lib/hmr/lazyCompilationBackend");

/** @typedef {import("../lib/hmr/LazyCompilationPlugin").BackendApi} BackendApi */
/** @typedef {import("http").Server} Server */
/** @typedef {import("net").Socket} Socket */

const PREFIX = "/lazy-compilation-using-";

// Bun can't install jest's `@sinonjs/fake-timers` (`setTimeout` cannot be
// faked), so these timer-driven cases are skipped there; they still run on Node.
const itSkipBun = process.versions.bun ? it.skip : it;

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
 * @returns {import("../lib/Module")} a fake module
 */
const makeModule = (id) =>
	/** @type {import("../lib/Module")} */ (
		/** @type {unknown} */ ({ identifier: () => id })
	);

/**
 * @param {BackendApi} api backend api
 * @param {Server} server fake server
 * @param {string} url request url
 * @returns {Socket} the request socket
 */
const connect = (api, server, url) => {
	const socket = makeSocket();
	const req = { url, socket };
	const res = { writeHead() {}, write() {} };
	server.emit("connection", socket);
	server.emit("request", req, res);
	return socket;
};

describe("lazyCompilationBackend", () => {
	beforeEach(() => jest.useFakeTimers());

	afterEach(() => jest.useRealTimers());

	/**
	 * @returns {{ api: BackendApi, server: Server, invalidate: jest.Mock }} harness
	 */
	const setup = () => {
		const server = makeServer();
		const invalidate = jest.fn();
		const compiler = /** @type {import("../lib/Compiler")} */ (
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

	itSkipBun(
		"activates a module while a client is connected and invalidates once",
		() => {
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
		}
	);

	itSkipBun(
		"keeps the module active until the last client disconnects, then drops it",
		() => {
			const { api, server } = setup();
			const mod = makeModule("mod-a");
			const { data: key } = api.module(mod);
			const s1 = connect(api, server, PREFIX + key);
			const s2 = connect(api, server, PREFIX + key);

			// first disconnect: still one client left after the idle delay
			s1.emit("close");
			jest.advanceTimersByTime(120000);
			expect(api.module(mod).active).toBe(true);

			// last disconnect: module goes idle
			s2.emit("close");
			jest.advanceTimersByTime(120000);
			expect(api.module(mod).active).toBe(false);
		}
	);

	itSkipBun("does not schedule idle timers or hang after dispose", () => {
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
		expect(jest.getTimerCount()).toBe(0);
	});

	itSkipBun("clears a pending idle timer on dispose", () => {
		const { api, server } = setup();
		const mod = makeModule("mod-a");
		const { data: key } = api.module(mod);
		const s1 = connect(api, server, PREFIX + key);

		s1.emit("close");
		expect(jest.getTimerCount()).toBe(1);

		api.dispose(() => {});
		expect(jest.getTimerCount()).toBe(0);
	});
});
