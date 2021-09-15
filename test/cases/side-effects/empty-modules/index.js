import "./module";
import "./cjs";
import "./pure";
import "./referenced";
import "./side-referenced";

if (process.env.NODE_ENV === "production") {
	it("should skip imports to empty modules", () => {
		expect(require.resolveWeak("./cjs")).toBe(null);
		expect(require.resolveWeak("./module")).toBe(null);
		expect(require.resolveWeak("./pure")).toBe(null);
		expect(require.resolveWeak("./referenced")).toBe(null);
	});
}

it("should not skip transitive side effects", () => {
	expect(global.value).toBe(true);
	delete global.value;
});
