it("should compile", async () => {
	const logs = global.__configCases__deferImport__proposal = [];

	// change to other way if webpack in the future rejects require a TLA esm.
	let mod = require("./entry.js");
	expect(mod).toBeInstanceOf(Promise);

	expect(logs).toEqual([
		"START async-mod-dep.js",
		"END async-mod-dep.js",
		"START async-mod.js",
		"START deep-async-dep.js",
		"START reexport-async-dep-inner.js"
	]);
	logs.length = 0;

	let { default: namespaces } = await mod;

	expect(logs).toEqual([
		"END async-mod.js",
		"END deep-async-dep.js",
		"END reexport-async-dep-inner.js",
		"START entry.js",
		"END entry.js"
	]);
	logs.length = 0;

	let fullSyncX = namespaces.fullSync.x;
	expect(fullSyncX).toBe(1);
	expect(logs).toEqual([
		"START full-sync-dep.js",
		"END full-sync-dep.js",
		"START full-sync.js",
		"END full-sync.js"
	]);
	logs.length = 0;

	let asyncModX = namespaces.asyncMod.x;
	expect(asyncModX).toBe(2);
	expect(logs).toEqual([]);

	let deepAsyncX = namespaces.deepAsync.x;
	expect(deepAsyncX).toBe(3);
	expect(logs).toEqual([
		"START deep-async.js",
		"END deep-async.js"
	]);
	logs.length = 0;

	let reexportAsync = namespaces.reexportAsync.dep;
	expect(reexportAsync).not.toBeInstanceOf(Promise);
	expect(logs).toEqual([
		"START reexport-async.js",
		"END reexport-async.js",
	]);

	logs.length = 0;
	let reexportAsyncX = reexportAsync.x;
	expect(reexportAsyncX).toBe(4);
	expect(logs).toEqual([
		"START reexport-async-dep.js",
		"END reexport-async-dep.js",
	]);
});
