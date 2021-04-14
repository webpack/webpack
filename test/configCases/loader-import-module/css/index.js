import stylesheet from "./stylesheet";
import stylesheet1 from "./stylesheet?1";
import otherStylesheet from "./other-stylesheet";

it("should be able to use build-time code", () => {
	expect(stylesheet).toBe(
		'body { background: url("/public/assets/file.png"); color: #f00; }'
	);
	expect(stylesheet1).toBe(
		'body { background: url("/public/assets/file.png?1"); color: #f00; }'
	);
	expect(otherStylesheet).toBe(
		'body { background: url("/other/assets/file.jpg"); color: #0f0; }'
	);
});
