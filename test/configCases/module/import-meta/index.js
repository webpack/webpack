if (!import.meta.UNKNOWN_PROPERTY) {
    // runtime assignment
    import.meta.UNKNOWN_PROPERTY = "HELLO";
}

it("should keep import.meta.UNKNOWN_PROPERTY", () => {
    try {
        const UNKNOWN_PROPERTY = import.meta.UNKNOWN_PROPERTY;
        expect(UNKNOWN_PROPERTY).toBe("HELLO");
        expect(typeof import.meta.UNKNOWN_PROPERTY).toBe("string");

        expect(typeof import.meta.webpack).toBe("number");

        const { UNKNOWN_PROPERTY: UNKNOWN_PROPERTY_2, webpack: WEBPACK_PROPERTY_2 } = import.meta;
        expect(UNKNOWN_PROPERTY_2).toBe("HELLO");
        expect(typeof WEBPACK_PROPERTY_2).toBe("number");
    } catch (_e) {
        // ignore
    }
});

it("should support destructuring assignment", async () => {
	let version, url2, c, unknown;
	({ webpack: version } = { url: url2 } = { c } = { UNKNOWN_PROPERTY: unknown } = import.meta);
	expect(version).toBeTypeOf("number");
	expect(url2).toBe(url);
	expect(c).toBe(undefined);
	expect(unknown).toBe("HELLO");

	let version2, url3, d, unknown2;
	({ webpack: version2 } = await ({ url: url3 } = ({ d } = { UNKNOWN_PROPERTY: unknown2 } = await import.meta)));
	expect(version2).toBeTypeOf("number");
	expect(url3).toBe(url);
	expect(d).toBe(undefined);
	expect(unknown2).toBe("HELLO");
});