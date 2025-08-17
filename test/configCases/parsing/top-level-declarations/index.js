import { a } from "./a";
import { createRequire } from "module";

const myRequire = createRequire(import.meta.url);
const { b } = myRequire("./b");
const c = new URL("./c.js", import.meta.url);
const audioContext = new AudioContext();
const d = audioContext.audioWorklet.addModule(new URL("./d.js", import.meta.url));

it("should have correct top level declarations", async () => {
	await d;
	expect(a).toBe(1);
	expect(b).toBe(2);
	expect(c.pathname.endsWith(".js")).toBe(true);
})