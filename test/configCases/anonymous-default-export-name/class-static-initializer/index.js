import Thing, { nameDuringDefinition } from "./Thing";

it("should name an anonymous default class before its static initializers run", () => {
	// A static initializer reads the name during ClassDefinitionEvaluation, so a
	// fix-up applied after the class expression is too late to be observed.
	expect(nameDuringDefinition).toBe("default");
	expect(Thing.name).toBe("default");
});
