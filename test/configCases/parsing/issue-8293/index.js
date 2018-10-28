const fs = require("fs");
const path = require("path");

it("should be able to replace import param in DefinePlugin", function() {
	const source = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	expect(source).toContain(`(\`./\${foobar}.js\`)`);
	expect(source).not.toContain(`(\`./\${NAME}.js\`)`);
});
