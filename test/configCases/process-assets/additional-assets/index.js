it("should `additionalAssets` work", () => {
	const { info } = __STATS__.assets.find(item => item.name === "file.txt");
	expect(info.new).toBe(true);
	expect(info.additional).toBe(true);
	expect(info.additionalAgain).toBe(true);

	const { info: info1 } = __STATS__.assets.find(item => item.name === "file1.txt");
	expect(info1.new).toBe(true);
	expect(info1.additional).toBeUndefined();
});
