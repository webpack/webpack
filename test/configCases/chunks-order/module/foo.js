import "./style.css";
import "./dependency.js";

it("The dependOn chunk must be loaded before the common chunk.", async () => {
	const fs = await eval(`import("fs")`)
	const source = fs.readFileSync(__filename, "utf-8");

	expect(source).toMatchSnapshot();
});
