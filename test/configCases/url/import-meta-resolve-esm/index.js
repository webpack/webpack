const fileRequest = "./file.json";
const otherRequest = "./other.json";

it("should resolve asset url with import.meta.resolve and a string literal", () => {
	const url = import.meta.resolve("./file.json");
	expect(typeof url).toBe("string");
	expect(url).toMatch(/file\.json/);
});

it("should return a different url for different assets", () => {
	const url1 = import.meta.resolve("./file.json");
	const url2 = import.meta.resolve("./other.json");
	expect(url1).not.toBe(url2);
	expect(url1).toMatch("file.json");
	expect(url2).toMatch("other.json");
});

it("should compile import.meta.resolve with a variable without errors", () => {
	try {
		const url = import.meta.resolve(fileRequest);
		expect(typeof url).toBe("string");
	} catch (_e) {
		// ignore
	}
});

it("should compile import.meta.resolve with an unknown arg without errors", () => {
	function getRequest() {
		return "./file.json";
	}
	try {
		const url = import.meta.resolve(getRequest());
		expect(typeof url).toBe("string");
	} catch (_e) {
		// ignore
	}
});
