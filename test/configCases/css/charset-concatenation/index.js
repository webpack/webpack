import root from "./root.text.css";
import middle from "./middle.text.css";

it("should concatenate text exportType modules with @charset chain", () => {
	expect(typeof root).toBe("string");
	expect(typeof middle).toBe("string");

	expect(root.match(/@charset/g)).toEqual(["@charset"]);
	expect(root.startsWith('@charset "UTF-8";\n')).toBe(true);
	expect(root).toContain(".leaf");
	expect(root).toContain(".middle");
	expect(root).toContain(".root");

	expect(middle.match(/@charset/g)).toEqual(["@charset"]);
	expect(middle.startsWith('@charset "UTF-8";\n')).toBe(true);
});

it("should concatenate every text-export css module into the entry scope", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	// index.js + root + middle + leaf = 4
	expect(concatModules[0].modules.length).toBeGreaterThanOrEqual(4);
});

it("should not include the require runtime when fully concatenated", () => {
	// __non_webpack_require__ keeps these requires out of the dependency
	// graph, so they don't pull the require runtime into the bundle and
	// defeat the assertion below.
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const source = fs.readFileSync(
		path.join(__dirname, "bundle0.js"),
		"utf-8"
	);

	// The webpack require runtime template defines a private module cache
	// variable; its identifier is only emitted when that runtime is
	// included. The bundle inlines this test file's source verbatim, so
	// the identifier is assembled at runtime to avoid matching itself.
	const marker = `__webpack_${"module"}_cache__`;
	expect(source).not.toContain(marker);
});
