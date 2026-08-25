import classes from "./dep";

it("should count 'this' in a class heritage clause and computed key", () => {
	expect(classes).toHaveLength(2);
});
