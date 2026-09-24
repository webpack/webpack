import url from "./data.json";
import notJsonUrl from "./not-json.json";

it("should emit both JSON assets", () => {
	expect(url).toMatch(/-data\.json$/);
	expect(notJsonUrl).toMatch(/-not-json\.json$/);
});
