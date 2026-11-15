import settings from "./settings.json";

const start = () => [
	new Worker(
		/* webpackChunkName: "named" */ /* webpackEntryOptions: { runtime: false } */
		new URL("./worker.js", import.meta.url)
	),
	new Worker(
		/* webpackEntryOptions: { runtime: false } */
		new URL("./worker.js?unnamed", import.meta.url)
	),
	new Worker(
		/* webpackEntryOptions: { name: ["main"], filename: "other-worker.js" } */
		new URL("./other-worker.js", import.meta.url)
	)
];
if (Math.random() < 0) start();

it("should keep the whole object the main entry reads from a module a worker shares", () => {
	expect(JSON.stringify(settings.security)).toBe('{"theme":"dark","level":1}');
});

it("should keep the main entry its own name", () => {
	const stats = __STATS__;
	expect(stats.assetsByChunkName.main).toEqual(["bundle0.js"]);
});
