import "./style.css";

it("should compile with the asset/bytes referenced only from CSS", () => {
	const asset = STATS_JSON.assets.find((a) => /\.css$/.test(a.name));
	expect(asset).toBeDefined();
});
