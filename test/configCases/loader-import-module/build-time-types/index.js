import "./style.css";
import "./plain.css";
import values from "./values.js";

it("should return the value of every asset type from importModule", () => {
	expect(values["asset"]).toBe("data:text/plain;base64,YXNzZXQK");
	expect(values["asset/inline"]).toBe("data:text/plain;base64,YXNzZXQK");
	expect(values["asset/resource"]).toBe("/public/assets/file.txt");
	expect(values["asset/source"]).toBe("asset\n");
	expect(values["asset/bytes"]).toEqual([97, 115, 115, 101, 116, 10]);
	const assets = __STATS__.assets.map((asset) => asset.name);
	expect(assets).toContain("assets/file.txt");
});

it("should return the value of modules the bundle also reads from css", () => {
	expect(values.image).toBe("/public/assets/image.png");
	expect(values.plain).toBe("object");
	expect(values.text.default).toContain("url(/public/assets/image.png)");
	expect(values.source).toBe("source\n");
});

it("should not add javascript to modules only importModule reads as javascript", () => {
	for (const name of ["./image.png", "css ./plain.css"]) {
		const module = __STATS__.modules.find((m) => m.name === name);
		expect(module.sizes).not.toHaveProperty("javascript");
	}
});
