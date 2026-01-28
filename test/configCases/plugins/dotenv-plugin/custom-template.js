"use strict";

it("should load env files based on custom template", () => {
	// Should load from .env.myLocal (custom template)
	expect(process.env.WEBPACK_CUSTOM_VAR).toBe("from-myLocal");
	
	// Should load from .env.production.myLocal (custom mode-specific template)
	expect(process.env.WEBPACK_PROD_CUSTOM).toBe("from-production-myLocal");
	
	// Should also load from standard .env
	expect(process.env.WEBPACK_API_URL).toBe("https://prod-api.example.com");
	
	// Custom template files should override .env values
	expect(process.env.WEBPACK_OVERRIDE_VAR).toBe("myLocal-value");
});

