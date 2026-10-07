import c from "./get-class-no-name";

export default class {
	f() {
		return "ok";
	}
}

expect(new c().f()).toBe("ok");
