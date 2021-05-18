import { v } from "./module";

export default it =>
	it("should have the correct exports", () => {
		expect(v).toBe("v");
	});
