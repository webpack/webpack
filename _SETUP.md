# Setup

At webpack we use `yarn` to execute commands.

If you already have `yarn` installed, do: `yarn setup`. This will complete all required steps.

If not, do: `npm run setup`, the setup will also install `yarn` for you.

That's all.

## Automated environments

An agent or a throwaway sandbox should run `yarn setup:agent` instead. It is the same setup, non-interactive and safe to re-run: it verifies `yarn.lock` rather than rewriting it, installs no global `yarn`, and links the checkout in as `node_modules/webpack` without touching yarn's machine-global link registry.

Some agents run it for you: Claude Code on the web from a `SessionStart` hook, Cursor's cloud agents from `.cursor/environment.json`, and the GitHub Copilot coding agent from `.github/workflows/copilot-setup-steps.yml`.

## Setup manually

### Setup your local webpack repository

```bash
git clone https://github.com/webpack/webpack.git
cd webpack
npm install -g yarn
yarn
yarn link
yarn link webpack
```

### To run the entire test suite use

```bash
yarn test
```

### To run only integration tests use

```bash
yarn test:integration
```

or in watch mode

```bash
yarn test:integration --watch
```

### To run only unit tests use

```bash
yarn test:unit
```

or in watch mode

```bash
yarn test:unit --watch
```

### To update Jest snapshots use

```bash
yarn test:update-snapshots
```

### To run benchmarks

```bash
yarn benchmark
```

### To run code formatter (prettier) run

```bash
yarn fmt
```

### To run all linters use

This performs linting on:

- eslint (lint:code script)
- dependencies (lint:yarn script)
- types (lint:types script)
- schema + format + generated files (lint:special script)

```bash
yarn lint
```

### To run only the typechecker use

```bash
yarn lint:types
```

or incremental (in watch mode)

```bash
yarn lint:types --watch
```

### To update all examples use

```bash
yarn build:examples
```

### To update a specific example use

```bash
cd examples/<path to example>
node build.js
```
