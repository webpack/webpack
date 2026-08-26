import embedded from "./embedded.css";
import "./asset.css";

it("should minify CSS a module embeds in a JavaScript string literal", () => {
	expect(embedded).toBe(".a{color:red;margin:10px}");
});
