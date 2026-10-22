import value from "./value";

it("should emit the hot update chunk under an entry name holding a path", () => {
	expect(value).toBe(WATCH_STEP === "0" ? 1 : 2);
	if (WATCH_STEP === "0") return;
	const names = STATS_JSON.assets.map((asset) => asset.name);
	expect(
		names.some((name) =>
			/^static\/webpack\/\[name\]\/entry\.js\.[0-9a-f]+\.hot-update\.js$/.test(
				name
			)
		)
	).toBe(true);
});
