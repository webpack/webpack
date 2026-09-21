import { shared } from "./module-a";
import {
	asShorthand,
	asComputed,
	asMethod,
	renamedOut
} from "./module-b";

it("keeps shorthand properties valid when the binding is renamed", () => {
	expect(shared).toBe("from module-a");
	expect(asShorthand.shared).toBe("from module-b");
	expect(asComputed["from module-b"]).toBe("from module-b");
	expect(asMethod.shared()).toBe("from module-b");
	expect(renamedOut).toBe("from module-b");
});
