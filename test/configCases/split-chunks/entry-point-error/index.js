import m from "./module";

it("should emit correct errors", () => {
	console.log.bind(console, m);
});
