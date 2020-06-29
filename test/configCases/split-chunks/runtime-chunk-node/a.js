import { value } from "./shared?1";

it("should share the instance with the other entry point", () => {
	expect(value).toBe(42);
});

it("should be able to load the shared instance on demand", () =>
	import(/* webpackChunkName: "shared" */ "./shared?2").then(({ value }) => {
		expect(value).toBe(24);
	}));
