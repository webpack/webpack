import * as f1 from "./f1/style.module.css";
import * as f2 from "./f2/style.module.css";

it("should generate unique hashed class names for same-named classes in different directories", () => {
	expect(f1.xxx).toBeDefined();
	expect(f2.xxx).toBeDefined();
	expect(f1.xxx).not.toBe(f2.xxx);
});
