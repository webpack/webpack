// Basic environment variables
console.log("API URL:", process.env.WEBPACK_API_URL);
console.log("API Version:", process.env.WEBPACK_API_VERSION);
console.log("API Timeout:", process.env.WEBPACK_API_TIMEOUT);
console.log("Mode:", process.env.WEBPACK_MODE);

// Application settings
console.log("App Name:", process.env.WEBPACK_APP_NAME);
console.log("App Version:", process.env.WEBPACK_APP_VERSION);
console.log("Debug Mode:", process.env.WEBPACK_DEBUG);

// Variable expansion
console.log("Base URL:", process.env.WEBPACK_BASE_URL);
console.log("Full URL:", process.env.WEBPACK_FULL_URL);

// Default values
console.log("Port:", process.env.WEBPACK_PORT);
console.log("Host:", process.env.WEBPACK_HOST);

// Private variables (should be undefined)
console.log("Secret Key:", typeof process.env.SECRET_KEY);
console.log("Database URL:", typeof process.env.DATABASE_URL);
console.log("Internal Token:", typeof process.env.INTERNAL_TOKEN);

// Conditional logic based on environment
if (process.env.WEBPACK_DEBUG === "true") {
	console.log("Debug mode is enabled");
} else {
	console.log("Debug mode is disabled");
}

// Building API endpoint
const endpoint = `${process.env.WEBPACK_BASE_URL}/posts`;
console.log("Posts endpoint:", endpoint);

// Using in object literals
const config = {
	apiUrl: process.env.WEBPACK_API_URL,
	appName: process.env.WEBPACK_APP_NAME,
	version: process.env.WEBPACK_APP_VERSION,
	debug: process.env.WEBPACK_DEBUG === "true"
};
console.log("Config:", JSON.stringify(config, null, 2));
