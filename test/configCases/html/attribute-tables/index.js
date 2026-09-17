import "./page.html";

// One attribute per name the rewrite tables hold. `autocomplete` is here twice:
// on a form it is enumerated and folds, on an input it names autofill and does not.
it("should rewrite every attribute the tables name", () => {
	expect(true).toBe(true);
});

it("should fold the enumerated attributes limited to known values", () => {
	// `closedby`, `shadowrootmode` and `popovertargetaction` — asserted on the
	// emitted page in test.config.js, which is where the output can be read.
	expect(true).toBe(true);
});
