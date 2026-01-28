const assertBuiltin = require("assert");
const asyncHooks = require("async_hooks");
const buffer = require("buffer");
const childProcess = require("child_process");
const cluster = require("cluster");
const consoleBuiltin = require("console");
const constants = require("constants");
const crypto = require("crypto");
const dgram = require("dgram");
const dns = require("dns");
const domain = require("domain");
const events = require("events");
const fs = require("fs");
const http = require("http");
const http2 = require("http2");
const https = require("https");
const inspector = require("inspector");
const moduleBuiltin = require("module");
const net = require("net");
const os = require("os");
const path = require("path");
const perfHooks = require("perf_hooks");
const processBuiltin = require("process");
const punycode = require("punycode");
const querystring = require("querystring");
const readline = require("readline");
const repl = require("repl");
const stream = require("stream");
const stringDecoder = require("string_decoder");
const sys = require("sys");
const timers = require("timers");
const tls = require("tls");
const traceEvents = require("trace_events");
const tty = require("tty");
const url = require("url");
const util = require("util");
const v8 = require("v8");
const vm = require("vm");
const zlib = require("zlib");

const builtinImports = {
	assert: assertBuiltin,
	async_hooks: asyncHooks,
	buffer,
	child_process: childProcess,
	cluster,
	console: consoleBuiltin,
	constants,
	crypto,
	dgram,
	dns,
	domain,
	events,
	fs,
	http,
	http2,
	https,
	inspector,
	module: moduleBuiltin,
	net,
	os,
	path,
	perf_hooks: perfHooks,
	process: processBuiltin,
	punycode,
	querystring,
	readline,
	repl,
	stream,
	string_decoder: stringDecoder,
	sys,
	timers,
	tls,
	trace_events: traceEvents,
	tty,
	url,
	util,
	v8,
	vm,
	zlib
};

const baseBuiltinCount = Object.keys(builtinImports).length;

// diagnostics_channel was backported to Node.js v14.17.0 and ships in v15.1.0+
const diagnosticsChannel =
	NODE_VERSION >= 14 ? require("diagnostics_channel") : undefined;

// It's hidden on Node <=16 unless `--experimental-wasi-unstable-preview1` is provided
const wasi = NODE_VERSION >= 18 ? require("wasi") : undefined;
const workerThreads =
	NODE_VERSION >= 12 ? require("worker_threads") : undefined;

// https://github.com/nodejs/node/pull/34962
const pathPosix = NODE_VERSION >= 15 ? require("path/posix") : undefined;
// https://github.com/nodejs/node/pull/34962
const pathWin32 = NODE_VERSION >= 15 ? require("path/win32") : undefined;
const dnsPromises = NODE_VERSION >= 15 ? require("dns/promises") : undefined;
const inspectorPromises =
	NODE_VERSION >= 19 ? require("inspector/promises") : undefined;
const streamConsumers =
	NODE_VERSION >= 16 ? require("stream/consumers") : undefined;
const streamPromises =
	NODE_VERSION >= 15 ? require("stream/promises") : undefined;

// https://github.com/nodejs/node/pull/34055
const utilTypes = NODE_VERSION >= 15 ? require("util/types") : undefined;
const streamWeb = NODE_VERSION >= 16 ? require("stream/web") : undefined;
const readlinePromises =
	NODE_VERSION >= 17 ? require("readline/promises") : undefined;
const timersPromises =
	NODE_VERSION >= 15 ? require("timers/promises") : undefined;

const assertStrict = NODE_VERSION >= 15 ? require("assert/strict") : undefined;
const fsPromises = NODE_VERSION >= 14 ? require("fs/promises") : undefined;

const optionalBuiltins = [
	["diagnostics_channel", diagnosticsChannel],
	["readline/promises", readlinePromises],
	["stream/consumers", streamConsumers],
	["stream/promises", streamPromises],
	["stream/web", streamWeb],
	["timers/promises", timersPromises],
	["wasi", wasi],
	["worker_threads", workerThreads],
	["inspector/promises", inspectorPromises],
	["dns/promises", dnsPromises],
	["path/posix", pathPosix],
	["path/win32", pathWin32],
	["util/types", utilTypes],
	["assert/strict", assertStrict],
	["fs/promises", fsPromises]
];

for (const [request, imported] of optionalBuiltins) {
	if (imported) builtinImports[request] = imported;
}

const itIfAvailable = (imported) =>
	imported
		? (desc, fn) =>
				it(desc, () => {
					fn(imported);
				})
		: () => {
				// skip
			};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

it("should generate import statement for built-in module in node", () => {
	const content = fs.readFileSync(__filename, "utf-8");

	expect(Object.keys(builtinImports)).toHaveLength(
		baseBuiltinCount +
			optionalBuiltins.filter(([, imported]) => Boolean(imported)).length
	);

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

itIfAvailable(assertStrict)(
	"should assert deep equality (assert/strict)",
	(assertStrict) => {
		expect(() =>
			assertStrict.deepStrictEqual({ a: 1 }, { a: 1 })
		).not.toThrow();
	}
);

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

itIfAvailable(diagnosticsChannel)(
	"should create channel (diagnostics_channel)",
	(channel) => {
		const diagnostics = channel.channel("test");
		expect(diagnostics).toBeDefined();
	}
);

it("should have lookup method (dns)", () => {
	expect(typeof dns.lookup).toBe("function");
});

itIfAvailable(dnsPromises)(
	"should have lookup method (dns/promises)",
	(dnsPromises) => {
		expect(typeof dnsPromises.lookup).toBe("function");
	}
);

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

itIfAvailable(fsPromises)(
	"should have readFile method (fs/promises)",
	(fsPromises) => {
		expect(typeof fsPromises.readFile).toBe("function");
	}
);

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

itIfAvailable(inspectorPromises)(
	"should have Session constructor (inspector/promises)",
	(inspectorPromises) => {
		expect(typeof inspectorPromises.Session).toBe("function");
	}
);

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

itIfAvailable(pathPosix)(
	"should join paths with posix style (path/posix)",
	(pathPosix) => {
		expect(pathPosix.join("/foo", "bar")).toBe("/foo/bar");
	}
);

itIfAvailable(pathWin32)(
	"should join paths with win32 style (path/win32)",
	(pathWin32) => {
		expect(pathWin32.join("C:\\foo", "bar")).toBe("C:\\foo\\bar");
	}
);

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

itIfAvailable(readlinePromises)(
	"should create interface (readline/promises)",
	(readlinePromises) => {
		expect(typeof readlinePromises.createInterface).toBe("function");
	}
);

it("should start repl (repl)", () => {
	expect(typeof repl.start).toBe("function");
});

it("should create readable stream (stream)", () => {
	const readable = new stream.Readable();
	expect(readable).toBeDefined();
});

itIfAvailable(streamConsumers)(
	"should have text method (stream/consumers)",
	(streamConsumers) => {
		expect(typeof streamConsumers.text).toBe("function");
	}
);

itIfAvailable(streamPromises)(
	"should have pipeline method (stream/promises)",
	(streamPromises) => {
		expect(typeof streamPromises.pipeline).toBe("function");
	}
);

itIfAvailable(streamWeb)(
	"should have ReadableStream (stream/web)",
	(streamWeb) => {
		expect(typeof streamWeb.ReadableStream).toBe("function");
	}
);

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

itIfAvailable(timersPromises)(
	"should have setTimeout (timers/promises)",
	(timersPromises) => {
		expect(typeof timersPromises.setTimeout).toBe("function");
	}
);

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

itIfAvailable(utilTypes)(
	"should check if promise (util/types)",
	(utilTypes) => {
		expect(utilTypes.isPromise(Promise.resolve())).toBe(true);
	}
);

it("should get heap statistics (v8)", () => {
	const stats = v8.getHeapStatistics();
	expect(stats).toBeDefined();
});

it("should run in context (vm)", () => {
	const result = vm.runInNewContext("1 + 1");
	expect(result).toBe(2);
});

itIfAvailable(wasi)("should have WASI constructor (wasi)", (wasi) => {
	expect(typeof wasi.WASI).toBe("function");
});

itIfAvailable(workerThreads)(
	"should check if main thread (worker_threads)",
	(workerThreads) => {
		expect(typeof workerThreads.isMainThread).toBe("boolean");
	}
);

it("should compress data (zlib)", () => {
	const compressed = zlib.gzipSync("test data");
	expect(Buffer.isBuffer(compressed)).toBe(true);
});
