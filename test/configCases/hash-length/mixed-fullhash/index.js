it("loads an async chunk whose filename mixes a runtime and an inlined [fullhash]", async () => {
	const m = await import("./async");
	expect(m.value).toBe(1);
});

it("loads an async stylesheet whose filename mixes a runtime and an inlined [fullhash]", async () => {
	if (typeof document === "undefined") return;
	await import("./async.css");
	expect(getComputedStyle(document.body).getPropertyValue("color")).toBe(
		" green"
	);
});
