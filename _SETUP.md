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

### To run only intergration tests use

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

### To run code formatter (prettier) run

```bash
yarn pretty
```

### To run all linters use

This performs linting on:

* eslint (code-lint script)
* schema (schema-lint script)
* types (type-lint script)

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
