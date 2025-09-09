const load = id => import(`app/${id}?query#hash`);


it("show override request", async () => {
	expect((await load("a")).default).toBe("override/a");
});
