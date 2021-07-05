it("should compile fine", () => {
	const a = new URL(
		"./generate-big-asset-loader.js?size=100000000!",
		import.meta.url
	);
	const b = new URL(
		"./generate-big-asset-loader.js?size=200000000!",
		import.meta.url
	);
	const c = new URL(
		"./generate-big-asset-loader.js?size=300000000!",
		import.meta.url
	);
	const d = new URL(
		"./generate-big-asset-loader.js?size=400000000!",
		import.meta.url
	);
	const e = new URL(
		"./generate-big-asset-loader.js?size=500000000!",
		import.meta.url
	);
	const f = new URL(
		"./generate-big-asset-loader.js?size=600000000!",
		import.meta.url
	);
});
