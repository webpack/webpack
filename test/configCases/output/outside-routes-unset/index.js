import "./style.css";
import img from "./img.png";

it("should compile", () => {
	expect(typeof img).toBe("string");
	// loaded only to emit them; the paths are checked after emitting
	if (Math.random() < 0) {
		import(/* webpackChunkName: "../routes-out/lazy" */ "./lazy");
		import("./lazy.css");
		new Worker(new URL("./worker.js", import.meta.url));
	}
});
