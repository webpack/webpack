it("should handle string type correctly", () => {
	expect(import.meta.env.STRING_VAR).toBe("string value");
	expect(typeof import.meta.env.STRING_VAR).toBe("string");
});

it("should handle number type correctly", () => {
	expect(import.meta.env.NUMBER_VAR).toBe(42);
	expect(typeof import.meta.env.NUMBER_VAR).toBe("number");
	expect(import.meta.env.NUMBER_VAR + 10).toBe(52);
});

it("should handle boolean true correctly", () => {
	expect(import.meta.env.BOOLEAN_TRUE).toBe(true);
	expect(typeof import.meta.env.BOOLEAN_TRUE).toBe("boolean");
	
	if (import.meta.env.BOOLEAN_TRUE) {
		expect(true).toBe(true);
	} else {
		throw new Error("Should not reach here");
	}
});

it("should handle boolean false correctly", () => {
	expect(import.meta.env.BOOLEAN_FALSE).toBe(false);
	expect(typeof import.meta.env.BOOLEAN_FALSE).toBe("boolean");
	
	if (import.meta.env.BOOLEAN_FALSE) {
		throw new Error("Should not reach here");
	} else {
		expect(true).toBe(true);
	}
});

it("should handle zero correctly", () => {
	expect(import.meta.env.ZERO).toBe(0);
	expect(typeof import.meta.env.ZERO).toBe("number");
	expect(import.meta.env.ZERO === 0).toBe(true);
	
	// Zero is falsy
	if (import.meta.env.ZERO) {
		throw new Error("Should not reach here");
	} else {
		expect(true).toBe(true);
	}
});

it("should handle empty string correctly", () => {
	expect(import.meta.env.EMPTY_STRING).toBe("");
	expect(typeof import.meta.env.EMPTY_STRING).toBe("string");
	expect(import.meta.env.EMPTY_STRING.length).toBe(0);
	
	// Empty string is falsy
	if (import.meta.env.EMPTY_STRING) {
		throw new Error("Should not reach here");
	} else {
		expect(true).toBe(true);
	}
});

it("should handle decimal numbers correctly", () => {
	expect(import.meta.env.DECIMAL).toBe(3.14);
	expect(typeof import.meta.env.DECIMAL).toBe("number");
	expect(import.meta.env.DECIMAL.toFixed(1)).toBe("3.1");
});

it("should handle typeof checks for different types", () => {
	expect(typeof import.meta.env.STRING_VAR).toBe("string");
	expect(typeof import.meta.env.NUMBER_VAR).toBe("number");
	expect(typeof import.meta.env.BOOLEAN_TRUE).toBe("boolean");
	expect(typeof import.meta.env.BOOLEAN_FALSE).toBe("boolean");
	expect(typeof import.meta.env.ZERO).toBe("number");
	expect(typeof import.meta.env.EMPTY_STRING).toBe("string");
	expect(typeof import.meta.env.DECIMAL).toBe("number");
});

it("should work in type guards", () => {
	// Type checking with typeof
	if (typeof import.meta.env.NUMBER_VAR === "number") {
		expect(import.meta.env.NUMBER_VAR * 2).toBe(84);
	}
	
	if (typeof import.meta.env.STRING_VAR === "string") {
		expect(import.meta.env.STRING_VAR.toUpperCase()).toBe("STRING VALUE");
	}
	
	if (typeof import.meta.env.BOOLEAN_TRUE === "boolean") {
		expect(import.meta.env.BOOLEAN_TRUE).toBe(true);
	}
});

it("should support mixed type operations", () => {
	// Number + number
	const sum = import.meta.env.NUMBER_VAR + import.meta.env.DECIMAL;
	expect(sum).toBeCloseTo(45.14, 2);
	
	// String concatenation
	const message = "Value: " + import.meta.env.STRING_VAR;
	expect(message).toBe("Value: string value");
	
	// Boolean logic
	const result = import.meta.env.BOOLEAN_TRUE && !import.meta.env.BOOLEAN_FALSE;
	expect(result).toBe(true);
});

it("should handle the entire env object with mixed types", () => {
	const env = import.meta.env;
	
	expect(typeof env).toBe("object");
	expect(env.STRING_VAR).toBe("string value");
	expect(env.NUMBER_VAR).toBe(42);
	expect(env.BOOLEAN_TRUE).toBe(true);
	expect(env.BOOLEAN_FALSE).toBe(false);
	expect(env.ZERO).toBe(0);
	expect(env.EMPTY_STRING).toBe("");
	expect(env.DECIMAL).toBe(3.14);
});

it("should destructure mixed types correctly", () => {
	const {
		STRING_VAR,
		NUMBER_VAR,
		BOOLEAN_TRUE,
		DECIMAL
	} = import.meta.env;
	
	expect(STRING_VAR).toBe("string value");
	expect(NUMBER_VAR).toBe(42);
	expect(BOOLEAN_TRUE).toBe(true);
	expect(DECIMAL).toBe(3.14);
});

