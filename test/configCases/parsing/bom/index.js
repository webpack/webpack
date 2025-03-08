import * as mod from "./module.js";
import * as style from "./style.css";
import * as text1 from "./text-with-bom.txt";
import * as text2 from "./test-without-bom.text";

it("should remove BOM", function() {
	const url = new URL("./resource-with-bom.ext", import.meta.url);

	expect(mod).toBeDefined();
	expect(style).toBeDefined();
	expect(text1).toBeDefined();
	expect(text2).toBeDefined();
	expect(url).toBeDefined();

	const module = "module.js"
	const modules = import("./dir/" + module);

	expect(modules).toBeDefined();
});
