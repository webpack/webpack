import p from "package";
import o from "other-package";

it("should run", () => {
	console.log.bind(console, p, o);
});
