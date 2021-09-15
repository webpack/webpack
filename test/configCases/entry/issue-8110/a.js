import run from "./c";
import "./d";

it("should not crash", () => {
	return run().then(result => {
		expect(result.default).toBe("ok");
	});
})
