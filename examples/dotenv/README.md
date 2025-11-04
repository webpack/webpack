This example demonstrates using the DotenvPlugin via the `dotenv` top-level configuration option.

The DotenvPlugin loads environment variables from `.env` files and exposes them in your application through `process.env`.

## Features Demonstrated

1. **Basic Environment Variables**: Load variables with `WEBPACK_` prefix
2. **Variable Expansion**: Reference other variables using `${VAR_NAME}` syntax
3. **Default Values**: Use `${VAR:-default}` for fallback values
4. **Security**: Non-prefixed variables are not exposed to the bundle
5. **Build-time Replacement**: Variables are replaced at compile time for better optimization

## Configuration

By default, the plugin:
- Loads `.env` file from the project root
- Only exposes variables with `WEBPACK_` prefix
- Supports variable expansion and default values
- Replaces `process.env.WEBPACK_*` with actual values at build time

# .env

Environment variables file (`.env.local` and `.env.*.local` are ignored by git):

```
# API Configuration
WEBPACK_API_URL=https://api.example.com
WEBPACK_API_VERSION=v1
WEBPACK_API_TIMEOUT=5000

# Application Settings
WEBPACK_APP_NAME=MyApp
WEBPACK_APP_VERSION=1.0.0
WEBPACK_DEBUG=false

# Variable expansion
WEBPACK_BASE_URL=${WEBPACK_API_URL}/${WEBPACK_API_VERSION}
WEBPACK_FULL_URL=${WEBPACK_BASE_URL}/users

# Default value operator
WEBPACK_PORT=${PORT:-3000}
WEBPACK_HOST=${HOST:-localhost}

# Private variables (not exposed without WEBPACK_ prefix)
SECRET_KEY=super-secret-key
DATABASE_URL=postgresql://localhost/my_db
INTERNAL_TOKEN=internal-use-only
```

# example.js

```javascript
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
```

# webpack.config.js

```javascript
"use strict";

const path = require("path");

module.exports = {
	// mode: "development" || "production",
	mode: "production",
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "output.js"
	},
	// Enable dotenv plugin with default settings
	// Loads .env file and exposes WEBPACK_* prefixed variables
	dotenv: true
	// Advanced usage:
	// dotenv: {
	//   dir: path.resolve(__dirname, "./custom-env-dir"),
	//   prefix: ["WEBPACK_", "APP_"],
	//   template: [".env", ".env.local", ".env.[mode]"]
	// }
};
```

# dist/output.js

```javascript
/******/ (() => { // webpackBootstrap
/*!********************!*\
  !*** ./example.js ***!
  \********************/
/*! unknown exports (runtime-defined) */
/*! runtime requirements:  */
// Basic environment variables
console.log("API URL:", "https://api.example.com");
console.log("API Version:", "v1");
console.log("API Timeout:", "5000");
console.log("Mode:", process.env.WEBPACK_MODE);

// Application settings
console.log("App Name:", "MyApp");
console.log("App Version:", "1.0.0");
console.log("Debug Mode:", "false");

// Variable expansion
console.log("Base URL:", "https://api.example.com/v1");
console.log("Full URL:", "https://api.example.com/v1/users");

// Default values
console.log("Port:", "3000");
console.log("Host:", "localhost");

// Private variables (should be undefined)
console.log("Secret Key:", typeof process.env.SECRET_KEY);
console.log("Database URL:", typeof process.env.DATABASE_URL);
console.log("Internal Token:", typeof process.env.INTERNAL_TOKEN);

// Conditional logic based on environment
if (false) // removed by dead control flow
{} else {
	console.log("Debug mode is disabled");
}

// Building API endpoint
const endpoint = `${"https://api.example.com/v1"}/posts`;
console.log("Posts endpoint:", endpoint);

// Using in object literals
const config = {
	apiUrl: "https://api.example.com",
	appName: "MyApp",
	version: "1.0.0",
	debug: "false" === "true"
};
console.log("Config:", JSON.stringify(config, null, 2));

/******/ })()
;
```

# Info

## Unoptimized

```
asset output.js 1.43 KiB [emitted] (name: main)
chunk (runtime: main) output.js (main) 1.48 KiB [entry] [rendered]
  > ./example.js main
  ./example.js 1.48 KiB [built] [code generated]
    [used exports unknown]
    entry ./example.js main
webpack X.X.X compiled successfully
```

## Production mode

```
asset output.js 870 bytes [emitted] [minimized] (name: main)
chunk (runtime: main) output.js (main) 1.48 KiB [entry] [rendered]
  > ./example.js main
  ./example.js 1.48 KiB [built] [code generated]
    [no exports used]
    entry ./example.js main
webpack X.X.X compiled successfully
```
