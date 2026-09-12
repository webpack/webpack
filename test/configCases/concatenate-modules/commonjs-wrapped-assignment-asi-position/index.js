import { mutate as mutateLoose, read as readLoose } from "./loose";
import { mutate as mutateStrict, read as readStrict } from "./strict.mjs";

it("should write through an interop default import at a statement start", () => {
	expect(mutateLoose()).toEqual([
		"assign",
		"compound",
		"update",
		"computed",
		"deep",
		"delete",
		"typeof",
		"void",
		"call",
		"new",
		"named",
		"namespaceCall",
		"namespace",
		"default"
	]);

	const loose = readLoose();

	expect(loose.value).toBe("assigned");
	expect(loose.count).toBe(4);
	expect(loose.flag).toBe(true);
	expect(loose.deep.leaf).toBe("reassigned");
	expect("gone" in loose).toBe(false);
});

it("should write through a strict ESM default import at a statement start", () => {
	expect(mutateStrict()).toEqual([
		"assign",
		"compound",
		"update",
		"computed",
		"deep",
		"namespaceAssign"
	]);

	const strict = readStrict();

	expect(strict.value).toBe("assigned");
	expect(strict.count).toBe(4);
	expect(strict.flag).toBe(true);
	expect(strict.deep.leaf).toBe("namespaced");
});

it("should reach both interop paths of the one wrapped module", () => {
	expect(readLoose()).not.toBe(readStrict());
	expect(mutateLoose().length).toBeGreaterThan(0);
	expect(readLoose().count).toBe(7);
});
