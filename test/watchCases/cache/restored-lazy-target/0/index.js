import { local, child } from "./parent";

it("should build the requested re-export", () => {
	expect([local, child]).toEqual(["local", "child"]);
});
