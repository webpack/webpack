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

**If you have discovered a bug or have a feature suggestion, please [create an issue on GitHub](https://github.com/webpack/webpack/issues/new).**

## Contributing to the webpack ecosystem

If you have created your own loader/plugin please include it on the relevant
documentation pages:

[List of loaders](https://webpack.js.org/loaders/) or [awesome-webpack](https://github.com/webpack-contrib/awesome-webpack#loaders)
[List of plugins](https://webpack.js.org/plugins) or [awesome-webpack](https://github.com/webpack-contrib/awesome-webpack#webpack-plugins)

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

## Discussions

Gitter is only for small questions. To discuss a subject in detail, please send a link to your forum or blog in the Gitter chat.
