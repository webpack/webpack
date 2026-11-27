import { list } from "./module";

it("should keep the statement end after an unused pure expression", () => {
	expect(list).toEqual([1, 2]);
});
