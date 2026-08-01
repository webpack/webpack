const promise = import(/* webpackChunkName: "second" */ "./lazy");

it("should name the chunk from the current magic comment", () => {
	const expected = WATCH_STEP === "0" ? "first" : "second";
	const names = STATS_JSON.assets.map((a) => a.name);
	expect(names.some((n) => n.includes(expected))).toBe(true);
	return promise;
});
