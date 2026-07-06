"use strict";

// `depd` reads V8 structured stack traces to locate deprecation call sites, but
// Bun does not provide them under jest (`prepareStackTrace` yields a string), so
// loading express/serve-index throws there. It only emits deprecation warnings, so
// a no-op keeps the dev server working uniformly on Node, Bun and Deno.
jest.mock("depd", () => () => {
	const deprecate = /** @type {EXPECTED_ANY} */ (() => {});
	deprecate.function = (/** @type {EXPECTED_ANY} */ fn) => fn;
	deprecate.property = () => {};
	return deprecate;
});

const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");

// Drives a real webpack-dev-server (added as a compiler plugin) in real Chrome via
// puppeteer-core. Bun and Deno report a Node-compatible version; require puppeteer
// and the dev server lazily so the suite self-skips where they (or Chrome) are
// missing. webpack-dev-server needs Node >= 22.15 (its floor, above puppeteer's >= 18).
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
const nodeSupported = nodeMajor > 22 || (nodeMajor === 22 && nodeMinor >= 15);

/** @type {typeof import("puppeteer-core") | undefined} */
let puppeteer;
/** @type {typeof import("webpack-dev-server") | undefined} */
let WebpackDevServer;
if (nodeSupported) {
	try {
		puppeteer = require("puppeteer-core");
		WebpackDevServer = require("webpack-dev-server");
	} catch (_err) {
		puppeteer = undefined;
		WebpackDevServer = undefined;
	}
}

const webpack = require("..");

// webpack-dev-server resolves `webpack/hot/dev-server` from its own location, but
// this repo is the `webpack` package itself and is not installed under
// node_modules, so self-link it there once (CI does the same via `yarn link
// webpack`). node_modules is gitignored, so this is a harmless test-time side effect.
const ensureWebpackSelfLink = () => {
	const root = path.resolve(__dirname, "..");
	const link = path.join(root, "node_modules", "webpack");
	try {
		if (fs.realpathSync(link) === fs.realpathSync(root)) return;
	} catch (_err) {
		// not linked yet — fall through and create it
	}
	try {
		fs.symlinkSync(root, link, "junction");
	} catch (_err) {
		// a real node_modules/webpack already exists — nothing to do
	}
};

/**
 * @param {number} ms milliseconds
 * @returns {Promise<void>} promise
 */
const sleep = (ms) =>
	new Promise((resolve) => {
		setTimeout(resolve, ms);
	});

/**
 * Stop the dev server, bounded by a timeout. Under jest-on-Bun `server.stop()`
 * can hang on a lingering client socket; the run force-exits regardless.
 * @param {import("webpack-dev-server")} server server
 * @returns {Promise<unknown>} promise
 */
const stopServer = (server) =>
	Promise.race([server.stop().catch(() => {}), sleep(8000)]);

/**
 * @returns {Promise<number>} a free TCP port on the loopback interface
 */
const findPort = () =>
	new Promise((resolve, reject) => {
		const srv = net.createServer();
		srv.unref();
		srv.on("error", reject);
		srv.listen(0, "127.0.0.1", () => {
			const { port } = /** @type {net.AddressInfo} */ (srv.address());
			srv.close(() => resolve(port));
		});
	});

/**
 * Resolve once the port accepts a TCP connection (the server is listening).
 * @param {number} port port
 * @returns {Promise<void>} promise
 */
const waitForPort = (port) =>
	new Promise((resolve, reject) => {
		const deadline = Date.now() + 10000;
		const attempt = () => {
			const socket = net.connect(port, "127.0.0.1");
			socket.once("connect", () => {
				socket.destroy();
				resolve();
			});
			socket.once("error", () => {
				socket.destroy();
				if (Date.now() > deadline) {
					reject(new Error("dev server did not start listening"));
				} else {
					setTimeout(attempt, 100);
				}
			});
		};
		attempt();
	});

/**
 * Poll `#app`'s text until it matches. Uses `page.evaluate` rather than
 * `page.waitForFunction`, which does not resolve under jest-on-Bun.
 * @param {import("puppeteer-core").Page} page page
 * @param {string} text expected text content
 * @param {number} timeout ms
 * @returns {Promise<void>} promise
 */
const waitForAppText = async (page, text, timeout) => {
	const deadline = Date.now() + timeout;
	let actual = null;
	for (;;) {
		try {
			actual = await page.evaluate(() => {
				const el = document.getElementById("app");
				return el ? el.textContent : null;
			});
			if (actual === text) return;
		} catch (err) {
			// A live-reload navigation tears down the execution context mid-eval;
			// keep polling until the new document settles.
			if (!/context was destroyed|Target closed/.test(String(err))) throw err;
		}
		if (Date.now() > deadline) {
			throw new Error(`timed out waiting for #app === ${text}, got ${actual}`);
		}
		await sleep(150);
	}
};

/**
 * @param {import("puppeteer-core").Page} page page
 * @returns {Promise<boolean>} whether the dev-server error overlay is present
 */
const hasOverlay = (page) =>
	page
		.evaluate(() =>
			Boolean(document.getElementById("webpack-dev-server-client-overlay"))
		)
		.catch((err) => {
			if (/context was destroyed|Target closed/.test(String(err))) return false;
			throw err;
		});

/**
 * Poll until the error overlay reaches the expected presence.
 * @param {import("puppeteer-core").Page} page page
 * @param {boolean} present expected presence
 * @param {number} timeout ms
 * @returns {Promise<void>} promise
 */
const waitForOverlay = async (page, present, timeout) => {
	const deadline = Date.now() + timeout;
	for (;;) {
		if ((await hasOverlay(page)) === present) return;
		if (Date.now() > deadline) {
			throw new Error(`timed out waiting for overlay present=${present}`);
		}
		await sleep(150);
	}
};

const INDEX_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>wds</title></head>
<body><div id="app"></div><script src="/main.js"></script></body></html>`;

/** @typedef {{ name?: string, path?: string, middleware: import("express").RequestHandler }} MiddlewareEntry */

// Serve index.html ourselves; dev-server's `static` handler pulls in serve-index
// and chokidar, whose dynamic imports fail under jest-on-Bun.
/**
 * @param {MiddlewareEntry[]} middlewares middleware stack
 * @returns {MiddlewareEntry[]} middleware stack
 */
const setupMiddlewares = (middlewares) => {
	middlewares.unshift({
		name: "index-html",
		middleware: (req, res, next) => {
			if (req.url === "/") {
				res.setHeader("Content-Type", "text/html");
				res.end(INDEX_HTML);
			} else {
				next();
			}
		}
	});
	return middlewares;
};

// Entry renders ./message into #app and hot-accepts it, so an HMR-applicable
// change swaps the text without reloading the page.
const INDEX_JS = `"use strict";
const el = document.getElementById("app");
el.textContent = require("./message");
if (module.hot) {
	module.hot.accept("./message", () => {
		el.textContent = require("./message");
	});
}
`;

/**
 * @param {string} version marker baked into the module export
 * @returns {string} module source
 */
const messageSource = (version) =>
	`"use strict";\nmodule.exports = "MESSAGE_${version}";\n`;

/**
 * Write the fixture app into a fresh temp dir.
 * @returns {{ dir: string, messagePath: string }} fixture paths
 */
const writeFixture = () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wds-"));
	const srcDir = path.join(dir, "src");
	fs.mkdirSync(srcDir);
	fs.writeFileSync(path.join(srcDir, "index.js"), INDEX_JS);
	const messagePath = path.join(srcDir, "message.js");
	fs.writeFileSync(messagePath, messageSource("V1"));
	return { dir, messagePath };
};

/**
 * Start the dev server via the plugin API and wait until it is listening and the
 * first compilation is done.
 * @param {string} dir fixture root
 * @param {number} port port to listen on
 * @param {NonNullable<ConstructorParameters<typeof import("webpack-dev-server")>[0]>} devServerOptions extra options
 * @returns {Promise<{ server: import("webpack-dev-server"), watching: import("..").Watching }>} handles to stop
 */
const startServer = (dir, port, devServerOptions) => {
	const Server = /** @type {typeof import("webpack-dev-server")} */ (
		WebpackDevServer
	);
	// Used as a plugin: added to `plugins`, `apply()` taps the compiler and starts
	// listening after the first watch build — no explicit `server.start()`.
	const server = new Server({
		port,
		host: "127.0.0.1",
		static: false,
		client: { logging: "none", overlay: false },
		setupMiddlewares,
		...devServerOptions
	});
	const compiler = webpack({
		mode: "development",
		context: dir,
		target: "web",
		entry: path.join(dir, "src/index.js"),
		output: {
			path: path.join(dir, "dist"),
			filename: "main.js",
			publicPath: "/"
		},
		infrastructureLogging: { level: "error" },
		stats: "none",
		plugins: [server]
	});

	return new Promise((resolve, reject) => {
		let started = false;
		/** @type {import("..").Watching} */
		let watching;
		compiler.hooks.done.tap("WebpackDevServerLongtest", () => {
			if (started) return;
			started = true;
			waitForPort(port).then(() => resolve({ server, watching }), reject);
		});
		// Poll instead of native file watching: libuv's Windows fs.watch aborts the
		// process on temp-dir paths ("Assertion failed ... fs-event.c"), and it keeps
		// edit detection reliable under Bun/Deno too.
		watching = /** @type {import("..").Watching} */ (
			compiler.watch({ poll: 200 }, (err) => {
				if (err) reject(err);
			})
		);
	});
};

describe("WebpackDevServer integration in real Chrome", () => {
	/** @type {import("puppeteer-core").Browser | undefined} */
	let browser;

	beforeAll(async () => {
		if (!puppeteer || !WebpackDevServer) return;
		ensureWebpackSelfLink();
		try {
			/** @type {import("puppeteer-core").LaunchOptions} */
			const launchOptions = {
				headless: true,
				args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
			};
			if (process.env.PUPPETEER_EXECUTABLE_PATH) {
				launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
			} else {
				launchOptions.channel = "chrome";
			}
			browser = await puppeteer.launch(launchOptions);
		} catch (_err) {
			// No usable Chrome in this environment — the tests self-skip below.
			browser = undefined;
		}
	}, 120000);

	afterAll(async () => {
		if (browser) await browser.close();
	});

	it("applies a hot module replacement update without reloading the page", async () => {
		if (!browser) {
			console.warn("Skipping: could not launch Chrome via puppeteer-core.");
			return;
		}

		const { dir, messagePath } = writeFixture();
		const port = await findPort();
		const { server, watching } = await startServer(dir, port, {
			hot: true,
			liveReload: false
		});
		const page = await browser.newPage();
		try {
			await page.goto(`http://127.0.0.1:${port}/`, {
				waitUntil: "domcontentloaded"
			});
			await waitForAppText(page, "MESSAGE_V1", 20000);

			// Marker on window survives an HMR patch but not a full page reload.
			await page.evaluate(() => {
				/** @type {EXPECTED_ANY} */ (window).__notReloaded = true;
			});

			fs.writeFileSync(messagePath, messageSource("V2"));
			await waitForAppText(page, "MESSAGE_V2", 20000);

			const notReloaded = await page.evaluate(
				() => /** @type {EXPECTED_ANY} */ (window).__notReloaded === true
			);
			expect(notReloaded).toBe(true);
		} finally {
			await page.close();
			await new Promise((resolve) => {
				watching.close(resolve);
			});
			await stopServer(server);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}, 90000);

	it("reloads the whole page on change when live reload is used", async () => {
		if (!browser) {
			console.warn("Skipping: could not launch Chrome via puppeteer-core.");
			return;
		}

		const { dir, messagePath } = writeFixture();
		const port = await findPort();
		const { server, watching } = await startServer(dir, port, {
			hot: false,
			liveReload: true
		});
		const page = await browser.newPage();
		try {
			await page.goto(`http://127.0.0.1:${port}/`, {
				waitUntil: "domcontentloaded"
			});
			await waitForAppText(page, "MESSAGE_V1", 20000);

			await page.evaluate(() => {
				/** @type {EXPECTED_ANY} */ (window).__notReloaded = true;
			});

			fs.writeFileSync(messagePath, messageSource("V2"));
			await waitForAppText(page, "MESSAGE_V2", 20000);

			const notReloaded = await page.evaluate(
				() => /** @type {EXPECTED_ANY} */ (window).__notReloaded === true
			);
			expect(notReloaded).toBe(false);
		} finally {
			await page.close();
			await new Promise((resolve) => {
				watching.close(resolve);
			});
			await stopServer(server);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}, 90000);

	it("shows the error overlay (enabled by default) on a compile error", async () => {
		if (!browser) {
			console.warn("Skipping: could not launch Chrome via puppeteer-core.");
			return;
		}

		const { dir, messagePath } = writeFixture();
		const port = await findPort();
		// No `overlay: false` here — exercise the default overlay.
		const { server, watching } = await startServer(dir, port, {
			hot: true,
			liveReload: false,
			client: { logging: "none" }
		});
		const page = await browser.newPage();
		try {
			await page.goto(`http://127.0.0.1:${port}/`, {
				waitUntil: "domcontentloaded"
			});
			await waitForAppText(page, "MESSAGE_V1", 20000);
			expect(await hasOverlay(page)).toBe(false);

			// An unterminated string is a module parse error; the default overlay
			// should surface the failed compilation.
			fs.writeFileSync(messagePath, '"use strict";\nmodule.exports = "oops');
			await waitForOverlay(page, true, 20000);
			expect(await hasOverlay(page)).toBe(true);
		} finally {
			await page.close();
			await new Promise((resolve) => {
				watching.close(resolve);
			});
			await stopServer(server);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	}, 90000);
});
