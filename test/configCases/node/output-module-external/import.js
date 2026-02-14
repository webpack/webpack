const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

it("should load node builtins via dynamic import", async () => {
	const load = async (modulePromise) => {
		const imported = await modulePromise;
		return imported.default || imported;
	};
	const expectIfAvailable = (imported, fn) => {
		if (imported) fn(imported);
	};

	const assertBuiltin = await load(import("assert"));
	const asyncHooks = await load(import("async_hooks"));
	const buffer = await load(import("buffer"));
	const childProcess = await load(import("child_process"));
	const cluster = await load(import("cluster"));
	const consoleBuiltin = await load(import("console"));
	const constants = await load(import("constants"));
	const crypto = await load(import("crypto"));
	const dgram = await load(import("dgram"));
	const dns = await load(import("dns"));
	const domain = await load(import("domain"));
	const events = await load(import("events"));
	const fs = await load(import("fs"));
	const http = await load(import("http"));
	const http2 = await load(import("http2"));
	const https = await load(import("https"));
	const inspector = await load(import("inspector"));
	const moduleBuiltin = await load(import("module"));
	const net = await load(import("net"));
	const os = await load(import("os"));
	const path = await load(import("path"));
	const perfHooks = await load(import("perf_hooks"));
	const processBuiltin = await load(import("process"));
	const punycode = await load(import("punycode"));
	const querystring = await load(import("querystring"));
	const readline = await load(import("readline"));
	const repl = await load(import("repl"));
	const stream = await load(import("stream"));
	const stringDecoder = await load(import("string_decoder"));
	const sys = await load(import("sys"));
	const timers = await load(import("timers"));
	const tls = await load(import("tls"));
	const traceEvents = await load(import("trace_events"));
	const tty = await load(import("tty"));
	const url = await load(import("url"));
	const util = await load(import("util"));
	const v8 = await load(import("v8"));
	const vm = await load(import("vm"));
	const zlib = await load(import("zlib"));

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

	const diagnosticsChannel =
		NODE_VERSION >= 14 ? await load(import("diagnostics_channel")) : undefined;
	const wasi = NODE_VERSION >= 18 ? await load(import("wasi")) : undefined;
	const workerThreads =
		NODE_VERSION >= 12 ? await load(import("worker_threads")) : undefined;

	const pathPosix =
		NODE_VERSION >= 15 ? await load(import("path/posix")) : undefined;
	const pathWin32 =
		NODE_VERSION >= 15 ? await load(import("path/win32")) : undefined;
	const dnsPromises =
		NODE_VERSION >= 15 ? await load(import("dns/promises")) : undefined;
	const inspectorPromises =
		NODE_VERSION >= 19 ? await load(import("inspector/promises")) : undefined;
	const streamConsumers =
		NODE_VERSION >= 16 ? await load(import("stream/consumers")) : undefined;
	const streamPromises =
		NODE_VERSION >= 15 ? await load(import("stream/promises")) : undefined;

	const utilTypes =
		NODE_VERSION >= 15 ? await load(import("util/types")) : undefined;
	const streamWeb =
		NODE_VERSION >= 16 ? await load(import("stream/web")) : undefined;
	const readlinePromises =
		NODE_VERSION >= 17 ? await load(import("readline/promises")) : undefined;
	const timersPromises =
		NODE_VERSION >= 15 ? await load(import("timers/promises")) : undefined;

	const assertStrict =
		NODE_VERSION >= 15 ? await load(import("assert/strict")) : undefined;
	const fsPromises =
		NODE_VERSION >= 14 ? await load(import("fs/promises")) : undefined;

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

	const content = fs.readFileSync(__filename, "utf-8");

	expect(Object.keys(builtinImports)).toHaveLength(
		baseBuiltinCount +
			optionalBuiltins.filter(([, imported]) => Boolean(imported)).length
	);

	for (const [request, imported] of Object.entries(builtinImports)) {
		expect(imported).toBeDefined();
		expect(content).toMatch(
			new RegExp(`import\\(\\s*["']${escapeRegExp(request)}["']\\s*\\)`)
		);
	}

	expect(() => assertBuiltin.strictEqual(1, 1)).not.toThrow();

	expectIfAvailable(assertStrict, (assertStrict) => {
		expect(() =>
			assertStrict.deepStrictEqual({ a: 1 }, { a: 1 })
		).not.toThrow();
	});

	const hook = asyncHooks.createHook({});
	expect(hook).toBeDefined();

	const buf = buffer.Buffer.from("hello");
	expect(buf.toString()).toBe("hello");

	expect(typeof childProcess.spawn).toBe("function");
	expect(typeof cluster.isMaster).toBe("boolean");

	const customConsole = new consoleBuiltin.Console(process.stdout);
	expect(customConsole).toBeDefined();

	expect(constants).toBeDefined();

	const hash = crypto.createHash("sha256").update("test").digest("hex");
	expect(hash).toBeDefined();

	const socket = dgram.createSocket("udp4");
	expect(socket).toBeDefined();
	socket.close();

	expectIfAvailable(diagnosticsChannel, (channel) => {
		const diagnostics = channel.channel("test");
		expect(diagnostics).toBeDefined();
	});

	expect(typeof dns.lookup).toBe("function");

	expectIfAvailable(dnsPromises, (dnsPromises) => {
		expect(typeof dnsPromises.lookup).toBe("function");
	});

	const d = domain.create();
	expect(d).toBeDefined();

	const emitter = new events.EventEmitter();
	const emitter2 = new events();
	expect(emitter).toBeDefined();
	expect(emitter2).toBeDefined();
	expect(events.EventEmitter).toBe(events);

	expect(typeof fs.existsSync).toBe("function");

	expectIfAvailable(fsPromises, (fsPromises) => {
		expect(typeof fsPromises.readFile).toBe("function");
	});

	const httpServer = http.createServer();
	expect(httpServer).toBeDefined();
	httpServer.close();

	expect(typeof http2.createSecureServer).toBe("function");
	expect(typeof https.createServer).toBe("function");
	expect(typeof inspector.url).toBe("function");

	expectIfAvailable(inspectorPromises, (inspectorPromises) => {
		expect(typeof inspectorPromises.Session).toBe("function");
	});

	expect(Array.isArray(moduleBuiltin.builtinModules)).toBe(true);

	const netServer = net.createServer();
	expect(netServer).toBeDefined();
	netServer.close();

	expect(typeof os.platform()).toBe("string");
	expect(path.extname("foo.js")).toBe(".js");

	expectIfAvailable(pathPosix, (pathPosix) => {
		expect(pathPosix.join("/foo", "bar")).toBe("/foo/bar");
	});

	expectIfAvailable(pathWin32, (pathWin32) => {
		expect(pathWin32.join("C:\\foo", "bar")).toBe("C:\\foo\\bar");
	});

	expect(perfHooks.performance).toBeDefined();
	expect(typeof processBuiltin.platform).toBe("string");
	expect(punycode.encode("mañana")).toBe("maana-pta");

	expect(querystring.parse("foo=bar&baz=qux")).toEqual({
		foo: "bar",
		baz: "qux"
	});

	expect(typeof readline.createInterface).toBe("function");

	expectIfAvailable(readlinePromises, (readlinePromises) => {
		expect(typeof readlinePromises.createInterface).toBe("function");
	});

	expect(typeof repl.start).toBe("function");

	const readable = new stream.Readable();
	expect(readable).toBeDefined();

	expectIfAvailable(streamConsumers, (streamConsumers) => {
		expect(typeof streamConsumers.text).toBe("function");
	});

	expectIfAvailable(streamPromises, (streamPromises) => {
		expect(typeof streamPromises.pipeline).toBe("function");
	});

	expectIfAvailable(streamWeb, (streamWeb) => {
		expect(typeof streamWeb.ReadableStream).toBe("function");
	});

	const decoder = new stringDecoder.StringDecoder("utf8");
	expect(decoder.write(Buffer.from("hello"))).toBe("hello");

	expect(sys).toEqual(util);
	expect(typeof timers.setTimeout).toBe("function");

	expectIfAvailable(timersPromises, (timersPromises) => {
		expect(typeof timersPromises.setTimeout).toBe("function");
	});

	expect(typeof tls.createServer).toBe("function");
	expect(typeof traceEvents.getEnabledCategories).toBe("function");
	expect(typeof tty.isatty).toBe("function");

	const parsed = url.parse("http://example.com/path");
	expect(parsed.hostname).toBe("example.com");

	expect(util.format("Hello %s", "World")).toBe("Hello World");

	expectIfAvailable(utilTypes, (utilTypes) => {
		expect(utilTypes.isPromise(Promise.resolve())).toBe(true);
	});

	const stats = v8.getHeapStatistics();
	expect(stats).toBeDefined();

	const result = vm.runInNewContext("1 + 1");
	expect(result).toBe(2);

	expectIfAvailable(wasi, (wasi) => {
		expect(typeof wasi.WASI).toBe("function");
	});

	expectIfAvailable(workerThreads, (workerThreads) => {
		expect(typeof workerThreads.isMainThread).toBe("boolean");
	});

	const compressed = zlib.gzipSync("test data");
	expect(Buffer.isBuffer(compressed)).toBe(true);
});
