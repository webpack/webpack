import Thing from "./Thing";

it("should not throw TDZ/ReferenceError for anonymous default export class in ES5 env", () => {
	// Per spec `export default class {}` has `.name === "default"`. The fix-up from
	// #20773 inserts an InitFragment referencing `__WEBPACK_DEFAULT_EXPORT__`, which
	// must run after the class declaration or hit a TDZ ReferenceError.
	const instance = new Thing();
	expect(instance.hello()).toBe("world");
	expect(Thing.name).toBe("default");
});
