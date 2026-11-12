import tick from "./tick";

it("should emit only current names for a shared entry dependency", () => {
	expect(tick).toBe(WATCH_STEP);
	const names = [["first"], ["second"], ["third"], [], ["shared", "second"], ["last"], []][Number(WATCH_STEP)];
	expect(STATS_JSON.assets.map((asset) => asset.name).sort()).toEqual(
		["bundle.js", ...names.map((name) => `${name}.js`)].sort()
	);
});
