import composes from "./composes.module.css";
import values from "./values.module.css";
import icss from "./icss.module.css";

const css = () =>
	document
		.getElementsByTagName("link")
		.find((link) => link.href.endsWith("bundle0.css"))
		.sheet.css.replace(/\s+/g, "");

it("follows composes chains at any depth", () => {
	expect({ ...composes }).toEqual({
		e: "e",
		d: "d e",
		c: "c d e",
		b: "b c d e",
		a: "a b c d e",
		x1: "x1 x2 x3 x4 x5",
		m1: "m1 m2 m3 m4 m5",
		multi: "multi b c d e x1 x2 x3 x4 x5",
		decls: "decls c d e m2 m3 m4 m5",
		left: "left d e",
		right: "right c d e",
		diamond: "diamond left d e right c d e",
		// The cycle ends where it started; the repeated name is harmless.
		loop: "loop loop-other loop"
	});
});

it("follows @value aliases and re-exports at any depth", () => {
	expect({ ...values }).toEqual({
		v1: "red",
		v2: "red",
		v3: "red",
		v4: "red",
		imported: "blue",
		alias: "blue",
		anim: "spin",
		sel: ".picked",
		// An imported value used as a name is scoped here, as a local `@value` is.
		spin: "spin",
		picked: "picked",
		local: "local",
		"via-import": "via-import",
		animated: "animated"
	});
	const text = css();
	expect(text).toContain(".local{color:red;}");
	expect(text).toContain(".via-import{color:blue;background:blue;}");
	expect(text).toContain("@keyframesspin{");
	expect(text).toContain(".animated{animation:spin1s;}");
	expect(text).toContain(".picked{color:black;}");
});

it("follows ICSS :import/:export re-exports at any depth", () => {
	expect({ ...icss }).toEqual({ tone: "purple", icss: "icss" });
	expect(css()).toContain(".icss{color:purple;}");
});
