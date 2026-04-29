import Cls from "./lib";

it("should not inject .name fix-up when anonymousDefaultExportName is disabled", () => {
	// Library authors don't need the .name = "default" fix-up.
	// When the option is off, the output should not contain any
	// Object.defineProperty / __webpack_require__.dn calls.
	const instance = new Cls();
	expect(instance.value).toBe(42);
	expect(Cls.name).not.toBe("default");
});
