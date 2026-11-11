// parsed, never called: each form bails out or only builds code
export function neverCalled(args, opts, k) {
	import.meta.webpackContext();
	import.meta.webpackContext("./dir", {}, 1);
	import.meta.webpackContext("./dir", "x");
	import("./data.json", { with: { ["type"]: "json" } });
	import("./data.json", { [k]: 1, assert: { type: "json" } });
	import("./data.json", { get with() { return { type: "json" }; } });
	new Worker();
	new Worker(...args);
	new Worker(new URL(...args));
	new Worker(new URL("./worker.js", ...args));
	new Worker(new Foo("./worker.js", import.meta.url));
	new Worker(import.meta["href"]);
	new Worker(import.meta[`href`]);
	new Worker(opts.url);
	new Worker(new URL("./worker.js", import.meta.url), {
		name: "w",
		...opts,
		type: "module",
		other: 1,
		[k]: 2
	});
	new SharedWorker(new URL("./worker.js", import.meta.url), "shared");
	new SharedWorker(new URL("./worker.js", import.meta.url), opts);
	System.import("./dir/a.js");
	new URL("./dir/a.js", opts);
	new URL("./dir/a.js", import.meta["url"]);
	new URL("./dir/a.js", import.meta["href"]);
	new URL("./dir/a.js", import.meta[`url`]);
	new URL("./dir/a.js", import.meta[k]);
	__webpack_is_included__(...args);
	require(["./dir/a.js"], opts.callback.bind(this));
	require(["./dir/a.js"], make(this));
	require(
		["./dir/a.js"],
		(function (_this) {
			make();
			return function () {};
		})(this)
	);
	require(
		["./dir/a.js"],
		(function (_this) {
			make();
		})(this)
	);
}
