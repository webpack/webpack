# Contributing to conda

Thank you for your interest in improving conda! Below, we describe how our
development process works and how you can be a part of it.

*Already know how to contribute and need help setting up your development environment?
[Read the development environment guide here][development-environment]*

## Hosted on GitHub

All development currently takes place on [GitHub][github]. This means we make extensive
use of the project management tools they provide such as [issues](https://github.com/conda/conda/issues)
and [projects](https://github.com/orgs/conda/projects).

## Code of Conduct

When you decide to contribute to this project, it is important to adhere to our
code of conduct, which is currently the [NumFOCUS Code of Conduct](https://www.numfocus.org/code-of-conduct).
Please read it carefully.

## Conda Contributor License Agreement

To begin contributing to this repository, you need to sign the Conda
Contributor License Agreement (CLA). In case you're new to CLAs, this
is a rather standard procedure for larger projects.
[Django](https://www.djangoproject.com/foundation/cla/) and
[Python](https://www.python.org/psf/contrib/contrib-form/) for example
both use similar agreements.

[Click here to sign the Conda Contributor License Agreement][conda cla].

A record of prior signatories is kept in a [separate repo in conda's GitHub][clabot] organization.

## Ways to contribute

Below are all the ways you can get involved in with conda.

### Bug reports and feature requests

Bug reports and feature requests are always welcome. To file a new issue,
[head to the issue form](https://github.com/conda/conda/issues/new/choose).

It should be noted that `conda-build` issues need to be filed separately at
[its issue tracker](https://github.com/conda/conda-build/issues).

For all other types of issues, please head to [Anaconda.org's "Report a Bug" page][anaconda-bug-report].
For even more information and documentation on everything related to Anaconda, head to the
[Support Center at Anaconda Nucleus][anaconda-support].

Before submitting an issue via any of these channels, make sure to document it
as well as possible and follow the submission guidelines (this makes everyone's job a lot easier!).

### Contributing your changes to conda

Here are the steps you need to take to contribute to conda:

1. [Signup for a GitHub account][github signup] (if you haven't already) and
   [install Git on your system][install git].
2. Sign the [Conda Contributor License Agreement][conda cla].
3. Fork the conda repository to your personal GitHub account by clicking the
   "Fork" button on [https://github.com/conda/conda](https://github.com/conda/conda) and follow GitHub's
   instructions.
4. Work on your proposed solution. [Visit this page if you need help getting your development environment setup][development-environment]
5. When you are ready to submit a change, create a new pull request so that we can merge your changes to our repository.

### Issue sorting

Issue sorting is how we filter incoming issues and get them ready for active development.
To see how this process works for this project, read "[The Issue Sorting Process at conda][sorting]".

*The project maintainers are currently not seeking help with issue sorting, but this may change in the future*


[conda cla]: https://conda.io/en/latest/contributing.html#conda-contributor-license-agreement
[clabot]: https://github.com/conda/infra/blob/main/.clabot
[install git]: https://git-scm.com/book/en/v2/Getting-Started-Installing-Git
[github signup]: https://github.com/signup
[github]: https://github.com/
[anaconda-issues]: https://github.com/ContinuumIO/anaconda-issues/issues
[anaconda-support]: https://anaconda.cloud/support-center
[anaconda-bug-report]: https://anaconda.org/contact/report
[sorting]: https://github.com/conda/infra/blob/main/HOW_WE_USE_GITHUB.md
[development-environment]: https://docs.conda.io/projects/conda/en/latest/dev-guide/development-environment.html

## Conda capitalization standards

1. Conda should be written in lowercase, whether in reference to the tool, ecosystem, packages, or organization.
2. References to the conda command should use code formatting (i.e. `conda`).
3. If the use of conda is not a command and if conda is at the beginning of a sentence, conda should be uppercase.

### Examples

#### In sentences

Beginning a sentence:

- Conda is an open-source package and environment management system.
- `conda install` can be used to install packages.

Conda in the middle of a sentence:

- If a newer version of conda is available, you can use `conda update conda` to update to that version.
- You can find conda packages within conda channels. The `conda` command can search these channels.

#### In titles and headers

Titles and headers should use the same capitalization and formatting standards as sentences.

#### In links

Links should use the same capitalization conventions as sentences. Because the conda docs currently use reStructuredText (RST) as a markup language, and [RST does not support nested inline markup](https://docutils.sourceforge.io/FAQ.html#is-nested-inline-markup-possible), documentation writers should avoid using code backtick formatting inside links.
