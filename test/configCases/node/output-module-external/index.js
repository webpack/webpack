const assertBuiltin = require("assert");
const assertStrict = require("assert/strict");
const asyncHooks = require("async_hooks");
const buffer = require("buffer");
const childProcess = require("child_process");
const cluster = require("cluster");
const consoleBuiltin = require("console");
const constants = require("constants");
const crypto = require("crypto");
const dgram = require("dgram");
const diagnosticsChannel = require("diagnostics_channel");
const dns = require("dns");
const dnsPromises = require("dns/promises");
const domain = require("domain");
const events = require("events");
const fs = require("fs");
const fsPromises = require("fs/promises");
const http = require("http");
const http2 = require("http2");
const https = require("https");
const inspector = require("inspector");

// The inspector/promises API was introduced in Node.js v19.0.0
// https://github.com/nodejs/node/pull/44250
const inspectorPromises =
	NODE_VERSION >= 19 ? require("inspector/promises") : require("inspector");
const moduleBuiltin = require("module");
const net = require("net");
const os = require("os");
const path = require("path");
const pathPosix = require("path/posix");
const pathWin32 = require("path/win32");
const perfHooks = require("perf_hooks");
const processBuiltin = require("process");
const punycode = require("punycode");
const querystring = require("querystring");
const readline = require("readline");
const readlinePromises = require("readline/promises");
const repl = require("repl");
const stream = require("stream");
const streamConsumers = require("stream/consumers");
const streamPromises = require("stream/promises");
const streamWeb = require("stream/web");
const stringDecoder = require("string_decoder");
const sys = require("sys");
const timers = require("timers");
const timersPromises = require("timers/promises");
const tls = require("tls");
const traceEvents = require("trace_events");
const tty = require("tty");
const url = require("url");
const util = require("util");
const utilTypes = require("util/types");
const v8 = require("v8");
const vm = require("vm");
const wasi = require("wasi");
const workerThreads = require("worker_threads");
const zlib = require("zlib");

const builtinImports = {
	assert: assertBuiltin,
	"assert/strict": assertStrict,
	async_hooks: asyncHooks,
	buffer,
	child_process: childProcess,
	cluster,
	console: consoleBuiltin,
	constants,
	crypto,
	dgram,
	diagnostics_channel: diagnosticsChannel,
	dns,
	"dns/promises": dnsPromises,
	domain,
	events,
	fs,
	"fs/promises": fsPromises,
	http,
	http2,
	https,
	inspector,
	"inspector/promises": inspectorPromises,
	module: moduleBuiltin,
	net,
	os,
	path,
	"path/posix": pathPosix,
	"path/win32": pathWin32,
	perf_hooks: perfHooks,
	process: processBuiltin,
	punycode,
	querystring,
	readline,
	"readline/promises": readlinePromises,
	repl,
	stream,
	"stream/consumers": streamConsumers,
	"stream/promises": streamPromises,
	"stream/web": streamWeb,
	string_decoder: stringDecoder,
	sys,
	timers,
	"timers/promises": timersPromises,
	tls,
	trace_events: traceEvents,
	tty,
	url,
	util,
	"util/types": utilTypes,
	v8,
	vm,
	wasi,
	worker_threads: workerThreads,
	zlib
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

it("should generate import statement for built-in module in node", () => {
	const content = fs.readFileSync(__filename, "utf-8");

	expect(Object.keys(builtinImports)).toHaveLength(54);

	for (const [request, imported] of Object.entries(builtinImports)) {
		expect(imported).toBeDefined();
		expect(content).toMatch(
			new RegExp(`import[^;]*from\\s+[\"']${escapeRegExp(request)}[\"']`)
		);
	}
});

it("should assert equality", () => {
	expect(() => assertBuiltin.strictEqual(1, 1)).not.toThrow();
});

it("should assert deep equality (assert/strict)", () => {
	expect(() => assertStrict.deepStrictEqual({ a: 1 }, { a: 1 })).not.toThrow();
});

it("should create async hook (async_hooks)", () => {
	const hook = asyncHooks.createHook({});
	expect(hook).toBeDefined();
});

it("should create buffer from string (buffer)", () => {
	const buf = buffer.Buffer.from("hello");
	expect(buf.toString()).toBe("hello");
});

it("should have spawn method (child_process)", () => {
	expect(typeof childProcess.spawn).toBe("function");
});

it("should identify master process (cluster)", () => {
	expect(typeof cluster.isMaster).toBe("boolean");
});

it("should create console instance (console)", () => {
	const customConsole = new consoleBuiltin.Console(process.stdout);
	expect(customConsole).toBeDefined();
});

it("should have errno constants (constants)", () => {
	expect(constants).toBeDefined();
});

it("should create hash (crypto)", () => {
	const hash = crypto.createHash("sha256").update("test").digest("hex");
	expect(hash).toBeDefined();
});

it("should create UDP socket (dgram)", () => {
	const socket = dgram.createSocket("udp4");
	expect(socket).toBeDefined();
	socket.close();
});

it("should create channel (diagnostics_channel)", () => {
	const channel = diagnosticsChannel.channel("test");
	expect(channel).toBeDefined();
});

it("should have lookup method (dns)", () => {
	expect(typeof dns.lookup).toBe("function");
});

it("should have lookup method (dns/promises)", () => {
	expect(typeof dnsPromises.lookup).toBe("function");
});

it("should create domain (domain)", () => {
	const d = domain.create();
	expect(d).toBeDefined();
});

it("should create event emitter (events)", () => {
	const emitter = new events.EventEmitter();
	expect(emitter).toBeDefined();
});

it("should check if file exists (fs)", () => {
	expect(typeof fs.existsSync).toBe("function");
});

it("should have readFile method (fs/promises)", () => {
	expect(typeof fsPromises.readFile).toBe("function");
});

it("should create server (http)", () => {
	const server = http.createServer();
	expect(server).toBeDefined();
	server.close();
});

it("should create secure server (http2)", () => {
	expect(typeof http2.createSecureServer).toBe("function");
});

it("should create server (https)", () => {
	expect(typeof https.createServer).toBe("function");
});

it("should have url method (inspector)", () => {
	expect(typeof inspector.url).toBe("function");
});

it("should have Session constructor (inspector/promises)", () => {
	expect(typeof inspectorPromises.Session).toBe("function");
});

it("should have builtinModules (module)", () => {
	expect(Array.isArray(moduleBuiltin.builtinModules)).toBe(true);
});

it("should create server (net)", () => {
	const server = net.createServer();
	expect(server).toBeDefined();
	server.close();
});

it("should get platform (os)", () => {
	expect(typeof os.platform()).toBe("string");
});

it("should correctly join paths (path)", () => {
	expect(path.extname("foo.js")).toBe(".js");
});

it("should join paths with posix style (path/posix)", () => {
	expect(pathPosix.join("/foo", "bar")).toBe("/foo/bar");
});

it("should join paths with win32 style (path/win32)", () => {
	expect(pathWin32.join("C:\\foo", "bar")).toBe("C:\\foo\\bar");
});

it("should get performance (perf_hooks)", () => {
	expect(perfHooks.performance).toBeDefined();
});

it("should get platform (process)", () => {
	expect(typeof processBuiltin.platform).toBe("string");
});

it("should encode unicode (punycode)", () => {
	expect(punycode.encode("mañana")).toBe("maana-pta");
});

it("should parse query string (querystring)", () => {
	expect(querystring.parse("foo=bar&baz=qux")).toEqual({
		foo: "bar",
		baz: "qux"
	});
});

it("should create interface (readline)", () => {
	expect(typeof readline.createInterface).toBe("function");
});

it("should create interface (readline/promises)", () => {
	expect(typeof readlinePromises.createInterface).toBe("function");
});

it("should start repl (repl)", () => {
	expect(typeof repl.start).toBe("function");
});

it("should create readable stream (stream)", () => {
	const readable = new stream.Readable();
	expect(readable).toBeDefined();
});

it("should have text method (stream/consumers)", () => {
	expect(typeof streamConsumers.text).toBe("function");
});

it("should have pipeline method (stream/promises)", () => {
	expect(typeof streamPromises.pipeline).toBe("function");
});

it("should have ReadableStream (stream/web)", () => {
	expect(typeof streamWeb.ReadableStream).toBe("function");
});

it("should decode buffer (string_decoder)", () => {
	const decoder = new stringDecoder.StringDecoder("utf8");
	expect(decoder.write(Buffer.from("hello"))).toBe("hello");
});

it("should be util alias (sys)", () => {
	expect(sys).toEqual(util);
});

it("should have setTimeout (timers)", () => {
	expect(typeof timers.setTimeout).toBe("function");
});

it("should have setTimeout (timers/promises)", () => {
	expect(typeof timersPromises.setTimeout).toBe("function");
});

it("should create server (tls)", () => {
	expect(typeof tls.createServer).toBe("function");
});

it("should get traced objects (trace_events)", () => {
	expect(typeof traceEvents.getEnabledCategories).toBe("function");
});

it("should check if terminal (tty)", () => {
	expect(typeof tty.isatty).toBe("function");
});

it("should parse URL (url)", () => {
	const parsed = url.parse("http://example.com/path");
	expect(parsed.hostname).toBe("example.com");
});

it("should format string (util)", () => {
	expect(util.format("Hello %s", "World")).toBe("Hello World");
});

it("should check if promise (util/types)", () => {
	expect(utilTypes.isPromise(Promise.resolve())).toBe(true);
});

it("should get heap statistics (v8)", () => {
	const stats = v8.getHeapStatistics();
	expect(stats).toBeDefined();
});

it("should run in context (vm)", () => {
	const result = vm.runInNewContext("1 + 1");
	expect(result).toBe(2);
});

it("should have WASI constructor (wasi)", () => {
	expect(typeof wasi.WASI).toBe("function");
});

it("should check if main thread (worker_threads)", () => {
	expect(typeof workerThreads.isMainThread).toBe("boolean");
});

it("should compress data (zlib)", () => {
	const compressed = zlib.gzipSync("test data");
	expect(Buffer.isBuffer(compressed)).toBe(true);
});
