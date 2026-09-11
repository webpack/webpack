import classes from "./classes.js";

it("should keep CSS module exports for a direct importModule() call", () => {
	for (const request of Object.keys(classes)) {
		expect(classes[request]).toEqual({ button: "button", title: "title" });
	}
	expect(Object.keys(classes)).toHaveLength(4);
});
