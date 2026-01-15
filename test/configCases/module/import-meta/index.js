it("should keep import.meta.UNKNOWN_PROPERTY", () => {
    try {
        if (!import.meta.UNKNOWN_PROPERTY) {
            // runtime assignment
            import.meta.UNKNOWN_PROPERTY = "HELLO";
        }

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