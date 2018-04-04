# Setup

At webpack we use `yarn` to execute commands.

If you already have `yarn` installed, do: `yarn setup`. This will complete all required steps.

If not, do: `npm run setup`, the setup will also install `yarn` for you.

That's all.

## Setup manually

Setup your local webpack repository

```bash
git clone https://github.com/webpack/webpack.git
cd webpack
npm install -g yarn
yarn install
yarn link
yarn link webpack
```

To run the entire test suite use:

```bash
yarn test
```
