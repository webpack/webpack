it("should be able to load the split chunk on demand (shared)", () => {
	return import(`./shared/${Math.floor(Math.random() * 20)}.js`);
});

it("should be able to load the split chunk on demand (common)", () => {
	return import(`./common/${Math.floor(Math.random() * 2)}.js`);
});
