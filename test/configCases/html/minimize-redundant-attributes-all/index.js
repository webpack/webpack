import "./page.html";

it("should also drop the spec defaults a selector can match, in `all`", () => {
	// The emitted page is the assertion — see the snapshot in test.config.js.
	expect(true).toBe(true);
});

it("should drop a value naming no keyword where that says the same", () => {
	// `<track kind=zzz>` is the metadata state, not the subtitles state a
	// missing `kind` names, so it stays — as do the two attributes whose IDL
	// hands a script back the value as written.
	expect(true).toBe(true);
});
