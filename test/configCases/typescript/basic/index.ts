import fs from "fs";
import mod1 from "./module.ts";
import mod2 from "./module-2.js";
import mod3 from "./module-3";
import mod4 from "@components/my-component.ts";
import mod5 from "./module-4.js";

const myString: string = "foo";

enum UserRole {
	Admin,
	Editor,
	Viewer
}

const myRole = UserRole.Viewer;

function getString(str: string): string {
	return str;
}

it("should work", () => {
	expect(myString).toBe("foo");
	expect(myRole).toBe(2);
	expect(getString("string")).toBe("string");
	expect(mod1).toBe("ok");
	expect(mod2).toBe("ok");
	expect(mod3).toBe("ok");
	expect(mod4).toBe("ok");
	expect(mod5).toBe("ok");
});

it("source maps should work", function() {
	const sourceMap = fs.readFileSync(__filename + ".map", "utf8");
	const original = fs.readFileSync(__filename, "utf8");

	const map = JSON.parse(sourceMap);
	const sourceIndex = map.sources.findIndex((item) => /index\.ts/.test(item));

	expect(sourceIndex).not.toBe(-1);
	expect(map.sourcesContent[sourceIndex]).toContain("enum UserRole {");
});
