# Dotenv examples

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
_{{.env}}_
```

# example.js

```javascript
_{{example.js}}_
```

# webpack.config.js

```javascript
_{{webpack.config.js}}_
```

# dist/output.js

```javascript
_{{dist/output.js}}_
```

# Info

## Unoptimized

```
_{{stdout}}_
```

## Production mode

```
_{{production:stdout}}_
```
