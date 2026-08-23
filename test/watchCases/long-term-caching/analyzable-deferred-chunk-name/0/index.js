const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

const EXPECTED_VALUE = { 0: "zero", 1: "one", 2: "one" };

it("should reach the deferred chunk that exists now", async () => {
	const lazy = STATS_JSON.assets.find((asset) => /^lazy\./.test(asset.name));
	expect(lazy).toBeDefined();
	expect((await load()).value).toBe(EXPECTED_VALUE[WATCH_STEP]);
	if (WATCH_STEP === "1") expect(lazy.name).not.toBe(STATE.lazyName);
	if (WATCH_STEP === "2") {
		expect(lazy.name).toBe(STATE.lazyName);
		delete STATE.lazyName;
	} else {
		STATE.lazyName = lazy.name;
	}
});

it("should write the parent again only when the name it bakes moves", () => {
	const bundle = STATS_JSON.assets.find((asset) => asset.name === "bundle.mjs");
	expect(bundle).toBeDefined();
	// Step 2 touches the other entry alone, so this one keeps the very source it
	// emitted last time and is not written out again.
	expect(bundle.emitted).toBe(WATCH_STEP !== "2");
});
