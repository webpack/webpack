import { angularStyle, multiline, nested, quoted, escaped, regex } from "./strings";
import { mapped, directive } from "./mapped";
import { block } from "./block";
import escapedSlash from "./regex-escaped";
import characterClass from "./regex-class";
import "./style.css";
const fs = require("fs");

it("should leave source map directives inside literals unchanged", () => {
	expect(angularStyle("styles.map")).toBe(
		"body {}\n/*# sourceMappingURL=styles.map */"
	);
	expect(multiline).toBe("\n//# sourceMappingURL=missing.map\n");
	expect(nested).toBe("//# sourceMappingURL=missing.map");
	expect(quoted).toBe("/*# sourceMappingURL=missing.map */");
	expect(escaped).toBe("`\n//# sourceMappingURL=missing.map\n");
	expect(regex.test("#")).toBe(true);
	expect(escapedSlash.source).toBe("\\/*# sourceMappingURL=missing.map *");
	expect(characterClass.source).toBe(
		new RegExp("[/*#sourceMappingURL=missing.map]*").source
	);
});

it("should remove the real directive without changing an identical string", () => {
	expect(mapped()).toBe("mapped");
	expect(directive).toBe("//# sourceMappingURL=mapped.js.map\n");
	const map = JSON.parse(fs.readFileSync(`${__filename}.map`, "utf8"));
	expect(map.sources.some(source => source.endsWith("/mapped-original.js"))).toBe(
		true
	);
});

it("should still extract JavaScript and CSS block comments", () => {
	expect(block()).toBe("block");
	const map = JSON.parse(fs.readFileSync(`${__filename}.map`, "utf8"));
	expect(map.sources.some(source => source.endsWith("/block-original.js"))).toBe(
		true
	);
	const cssMap = JSON.parse(
		fs.readFileSync(__filename.replace(/\.js$/, ".css.map"), "utf8")
	);
	expect(cssMap.sources.some(source => source.endsWith("/style-original.css"))).toBe(
		true
	);
});
