import { shared } from "./shared";

it("should carry the container and sharing runtime without leaving es5", function () {
	expect(shared).toBe("shared");
});
