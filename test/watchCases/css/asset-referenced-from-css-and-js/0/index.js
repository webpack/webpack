import "./style.css";

it("should emit the asset referenced only from CSS", () => {
	const asset = STATS_JSON.assets.find((a) => /file\.txt$/.test(a.name));
	expect(asset).toBeDefined();
});
