import { "foo" as foo } from "./style.module.css";

const isBrowser = typeof window !== "undefined";

// SSR registry lives on globalThis, namespaced by uniqueName
function collectedCss() {
	const key = Object.keys(globalThis).find((k) =>
		k.startsWith("__webpack_css__")
	);
	return key ? globalThis[key] : undefined;
}

it("exports CSS module class names on both web and node", () => {
	expect(typeof foo).toBe("string");
	expect(foo).toContain("foo");
});

it("injects styles into the DOM on web and collects them for SSR on node", () => {
	if (isBrowser) {
		const allCSS = Array.from(
			window.document.getElementsByTagName("style")
		).map((s) => s.textContent);
		expect(allCSS.some((c) => c.includes("color: red"))).toBe(true);
	} else {
		// node: styles collected on the global registry instead of dropped
		const registry = collectedCss();
		expect(registry).toBeTruthy();
		expect(Object.values(registry).join("\n")).toContain("color: red");
	}
});
