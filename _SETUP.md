# Setup

At webpack we use `yarn` to execute commands.

If you already have `yarn` installed, do: `yarn setup`. This will complete all required steps.

If not, do: `npm run setup`, the setup will also install `yarn` for you.

That's all.

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
yarn type-lint
```

or incremental (in watch mode)

```bash
yarn type-lint --watch
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
