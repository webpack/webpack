import fs from "fs";
import path from "path";

const otherBase = "https://example.com/assets/";

// Every name below points at a file this build never emits. Read as an
// output-relative reference, each would be reported as missing.
export const againstAnotherBase = new URL("./not-emitted-a.txt", otherBase);

export function withoutABase() {
	return new URL("./not-emitted-b.txt");
}

export function fromNewTarget() {
	return new URL("./not-emitted-c.txt", new.target.url);
}

export const built = (name) => import(/* webpackIgnore: true */ name);

it("should keep the forms a walk must read past", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(bundle).toContain("./not-emitted-a.txt");
	expect(bundle).toContain("./not-emitted-b.txt");
	expect(bundle).toContain("./not-emitted-c.txt");
	expect(bundle).toContain("new.target.url");
	expect(bundle).toContain("import(name)");
});

it("should resolve a url against the base it was given", () => {
	expect(againstAnotherBase.href).toBe(
		"https://example.com/assets/not-emitted-a.txt"
	);
});
