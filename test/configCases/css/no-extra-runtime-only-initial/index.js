import { exportName } from "./style.modules.css";
import { div } from "./module.js";

it("should don't generate extra runtime modules", () => {
	expect(exportName).toBeDefined();
	expect(div(2, 2)).toBe(1);
	console.log(__STATS__.modules)
	expect(__STATS__.modules.length).toBe(5);
});
