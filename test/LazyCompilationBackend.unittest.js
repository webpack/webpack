"use strict";

const http = require("http");
const createBackend = require("../lib/hmr/lazyCompilationBackend");

describe("lazyCompilationBackend clientError logging", () => {
	/** @type {import("http").Server} */
	let server;
	/** @type {jest.Mock} */
	let warn;
	/** @type {{ dispose: (callback: (err?: Error | null) => void) => void }} */
	let backend;

	beforeEach((done) => {
		warn = jest.fn();
		const compiler = { getInfrastructureLogger: () => ({ log() {}, warn }) };
		// A `server` factory hands us the underlying server so we can emit the
		// `clientError` events the backend would otherwise only see from sockets.
		createBackend({
			server: () => {
				server = http.createServer();
				return server;
			},
			listen: 0,
			protocol: "http",
			client: "webpack/hot/lazy-compilation-web.js"
		})(/** @type {EXPECTED_ANY} */ (compiler), (err, b) => {
			if (err) return done(err);
			backend = /** @type {EXPECTED_ANY} */ (b);
			done();
		});
	});

	afterEach((done) => {
		backend.dispose(() => done());
	});

	it("does not warn on benign client disconnects", () => {
		server.emit(
			"clientError",
			Object.assign(new Error("aborted"), { code: "ECONNRESET" })
		);
		server.emit("clientError", new Error("Server is disposing"));
		expect(warn).not.toHaveBeenCalled();
	});

	it("warns on a genuine client error", () => {
		const error = new Error("Parse Error");
		server.emit("clientError", error);
		expect(warn).toHaveBeenCalledWith(error);
	});
});
