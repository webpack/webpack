# Contributing

From opening a bug report to creating a pull request: every contribution is
appreciated and welcome. If you're planning to implement a new feature or change
the api please create an issue first. This way we can ensure that your precious
work is not in vain.

## Issues

Most of the time, if webpack is not working correctly for you it is a simple configuration issue.

If you are still having difficulty after looking over your configuration carefully, please post
a question to [StackOverflow with the webpack tag](http://stackoverflow.com/tags/webpack). Questions
that include your webpack.config.js and relevant files are more likely to receive responses.

**If you have discovered a bug or have a feature suggestion, feel free to create an issue on Github.**

## Contributing to the webpack ecosystem

If you have created your own loader/plugin please include it on the relevant
documentation pages:

[List of loaders](https://webpack.github.io/docs/list-of-loaders.html)  
[List of plugins](https://webpack.github.io/docs/list-of-plugins.html)

## Setup

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

## Submitting Changes

After getting some feedback, push to your fork and submit a pull request. We
may suggest some changes or improvements or alternatives, but for small changes
your pull request should be accepted quickly.

Some things that will increase the chance that your pull request is accepted:

* [Write tests](./test/README.md)
* Follow the existing coding style
* Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)

## Documentation

webpack is insanely feature rich and documentation is a huge time sink. We
greatly appreciate any time spent fixing typos or clarifying sections in the
documentation.
