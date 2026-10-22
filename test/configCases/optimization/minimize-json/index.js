import url from "./data.json";
import notJsonUrl from "./not-json.json";
import manifestUrl from "./site.webmanifest";

it("should emit both JSON assets", () => {
	expect(url).toMatch(/-data\.json$/);
	expect(notJsonUrl).toMatch(/-not-json\.json$/);
	expect(manifestUrl).toMatch(/-site\.webmanifest$/);
});
