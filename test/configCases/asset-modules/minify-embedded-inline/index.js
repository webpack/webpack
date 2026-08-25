import icon from "./icon.svg";

it("should reach the payload an asset/inline module encodes into a data URI", () => {
	expect(icon).toMatchSnapshot();
});

it("should encode what came back, not what was written", () => {
	const payload = Buffer.from(
		icon.slice(icon.indexOf(",") + 1),
		"base64"
	).toString("utf8");

	expect(payload).toBe(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"> <rect width="10" height="10" /> </svg>'
	);
});
