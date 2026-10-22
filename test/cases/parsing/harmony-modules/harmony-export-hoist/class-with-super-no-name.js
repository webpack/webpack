import c from "./get-class-with-super-no-name";

class sup {
	g() {
		return "ok";
	}
}

export default class extends sup {
	f() {
		return "ok";
	}
}

expect(new c().f()).toBe("ok");
expect(new c().g()).toBe("ok");
