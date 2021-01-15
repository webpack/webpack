# Contributing

From opening a bug report to creating a pull request: every contribution is
appreciated and welcome. If you're planning to implement a new feature or change
the api please create an issue first. This way we can ensure that your precious
work is not in vain.

## Issues

Most of the time, if webpack is not working correctly for you, it is a simple configuration issue.

If you are still having difficulty after looking over your configuration carefully, please post
a question to [StackOverflow with the webpack tag](https://stackoverflow.com/tags/webpack). Questions
that include your webpack.config.js, relevant files, and the full error message are more likely to receive responses.

**If you have discovered a bug or have a feature suggestion, please [create an issue on GitHub](https://github.com/webpack/webpack/issues/new).**

Do you want to fix an issue? Look at the issues with a tag of [X5: work required (PR / Help Wanted)](https://github.com/webpack/webpack/labels/X5%3A%20work%20required%20%28PR%20%2F%20Help%20Wanted%29). Each issue should be tagged with a difficulty tag -

- D0: My First Commit (Contribution Difficulty)
- D1: Easy (Contribution Difficulty)
- D2: Medium (Contribution Difficulty)
- D3: Hard (Contribution Difficulty)

## Contributing to the webpack ecosystem

If you have created your own loader/plugin please include it on the relevant documentation pages:

- [List of loaders](https://webpack.js.org/loaders/) or [awesome-webpack](https://github.com/webpack-contrib/awesome-webpack#loaders)
- [List of plugins](https://webpack.js.org/plugins) or [awesome-webpack](https://github.com/webpack-contrib/awesome-webpack#webpack-plugins)

## Setup

[Setup your local webpack repository](_SETUP.md)

## Submitting Changes

After getting some feedback, push to your fork and submit a pull request. We
may suggest some changes or improvements or alternatives, but for small changes
your pull request should be accepted quickly.

Something that will increase the chance that your pull request is accepted:

- [Write tests](./test/README.md)
- Follow the existing coding style
- Write a [good commit message](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
- For a major fix/feature make sure your PR has an issue and if it doesn't, please create one. This would help discussion with the community, and polishing ideas in case of a new feature.
- Make sure your PR's description contains GitHub's special keyword references that automatically close the related issue when the PR is merged. ([More info](https://github.com/blog/1506-closing-issues-via-pull-requests))
- When you have a lot of commits in your PR, it's good practice to squash all your commits in one single commit. ([Learn how to squash here](https://davidwalsh.name/squash-commits-git))

## Documentation

webpack is insanely feature rich and documentation is a huge time sink. We
greatly appreciate any time spent fixing typos or clarifying sections in the
documentation. [See a list of issues with the documentation tag](https://github.com/webpack/webpack/labels/documentation),
or [check out the issues on the documentation website's repository](https://github.com/webpack/webpack.js.org/issues).

## Discussions

Gitter is only for small questions. To discuss a subject in detail, please send a link to your forum or blog in the Gitter chat.

## Join the development

- Before you join development, please [set up the project](./_SETUP.md) on your local machine, run it and go through the application completely. Use any command you can find and see what it does. Explore.

  > Don't worry ... Nothing will happen to the project or to you due to the exploring. Only thing that will happen is, you'll be more familiar with what is where and might even get some cool ideas on how to improve various aspects of the project.

- If you would like to work on an issue, drop in a comment at the issue. If it is already assigned to someone, but there is no sign of any work being done, please feel free to drop in a comment so that the issue can be assigned to you if the previous assignee has dropped it entirely.
