import data from "./data.json";

it("should move the json module into a separate chunk", () => {
	expect(data.value).toBe(42);
});
