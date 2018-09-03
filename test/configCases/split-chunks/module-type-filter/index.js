import { value } from "./data.json";

it("should move the json module into a separate chunk", () => {
	expect(value).toBe(42);
})
