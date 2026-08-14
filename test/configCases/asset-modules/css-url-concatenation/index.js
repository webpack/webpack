import "./s.css";

it("should keep the stylesheet the asset's only consumer", () => {
	expect(__STATS__.assets.map((asset) => asset.name)).toContain("img.png");
});
