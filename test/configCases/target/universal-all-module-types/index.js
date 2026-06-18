import cjsValue from "./cjs";
import jsonData from "./data.json" with { type: "json" };
import defer * as deferred from "./deferred.js";
import { esmValue } from "./esm.js";
import html from "./page.html";
import inlineSvg from "./inline.svg";
import * as cssModule from "./styles.module.css";
import sheet from "./style.css" with { type: "css" };
import txtSource from "./file.txt";
import answer from "ext-var";
import source srcExpr from "ext-source";

const isBrowser = typeof window !== "undefined";

it("supports esm imports/exports", () => {
	expect(esmValue).toBe("esm");
});

it("supports commonjs interop", () => {
	expect(cjsValue).toBe("cjs");
});

it("supports json modules with import attributes", () => {
	expect(jsonData.value).toBe(42);
});

it("supports top-level await (via dynamic import)", async () => {
	const { tla } = await import("./async-mod.js");
	expect(tla).toBe("tla");
});

it("supports var externals", () => {
	expect(answer).toBe(42);
});

it("supports source phase imports of externals", () => {
	expect(srcExpr).toBe(3);
});

it("supports deferred imports", () => {
	expect(deferred.value).toBe("deferred");
});

it("supports dynamic imports", async () => {
	const m = await import("./dynamic.js");
	expect(m.default).toBe("dynamic");
});

it("supports asset/resource via new URL(import.meta.url)", () => {
	const url = new URL("./asset.png", import.meta.url);
	expect(url.href).toMatch(/\.png$/);
});

it("supports asset/source", () => {
	expect(txtSource.trim()).toBe("hello asset source");
});

it("supports asset/inline (data URL)", () => {
	expect(inlineSvg).toMatch(/^data:image\/svg\+xml/);
});

it("supports css imported as a constructable stylesheet", () => {
	if (isBrowser) {
		expect(sheet).toBeInstanceOf(CSSStyleSheet);
	} else {
		expect(typeof sheet.cssText).toBe("string");
		expect(sheet.cssText).toContain(".box");
	}
});

it("supports css modules with named exports", () => {
	expect(typeof cssModule.box).toBe("string");
});

it("supports html modules", () => {
	expect(typeof html).toBe("string");
	expect(html).toContain("<img");
});

it("supports async webassembly (via dynamic import)", async () => {
	const wasm = await import("./add.wat");
	expect(wasm.add(wasm.getNumber(), 2)).toBe(42);
	expect(wasm.add(1, 2)).toBe(3);
});

it("supports workers in node and on the web", async () => {
	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	const result = await new Promise((resolve, reject) => {
		// node `worker_threads` exposes `.on`, web workers use `onmessage`
		if (typeof worker.on === "function") {
			worker.on("message", resolve);
			worker.on("error", reject);
		} else {
			worker.onmessage = (event) => resolve(event.data);
			worker.onerror = reject;
		}
		worker.postMessage("ok");
	});
	expect(result).toBe("worker: OK");
	await worker.terminate();
});
