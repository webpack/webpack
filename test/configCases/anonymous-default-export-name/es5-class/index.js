import Thing from "./Thing";

it("should not throw TDZ/ReferenceError for anonymous default export class in ES5 env", () => {
	// Per ES spec, `export default class {}` should have .name === "default".
	// The anonymous-default fix-up introduced in PR #20773 inserts an
	// InitFragment that references `__WEBPACK_DEFAULT_EXPORT__` — ensure it
	// runs *after* the class declaration (classes are not hoisted, so it
	// would hit a TDZ ReferenceError otherwise).
	const instance = new Thing();
	expect(instance.hello()).toBe("world");
	expect(Thing.name).toBe("default");
});
