import "./tla.js"
const a = import("./defer.js")
import.meta.webpackHot.accept(["./defer.js"], () => {})
it("should compile", async () => {
	expect(await a).toBeTruthy();
});
