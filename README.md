<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200" src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <br>
  <br>

[![npm][npm]][npm-url]

[![node][node]][node-url]
[![builds1][builds1]][builds1-url]
[![dependency-review][dependency-review]][dependency-review-url]
[![coverage][cover]][cover-url]
[![pkg.pr.new](https://pkg.pr.new/badge/webpack/webpack)](https://pkg.pr.new/~/webpack/webpack)
[![PR's welcome][prs]][prs-url]
[![compatibility-score](https://api.dependabot.com/badges/compatibility_score?dependency-name=webpack&package-manager=npm_and_yarn&previous-version=5.72.1&new-version=5.73.0)](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates#about-compatibility-scores)
[![downloads](https://img.shields.io/npm/dm/webpack.svg)](https://npmcharts.com/compare/webpack?minimal=true)
[![install-size](https://packagephobia.com/badge?p=webpack)](https://packagephobia.com/result?p=webpack)
[![backers](https://opencollective.com/webpack/backers/badge.svg)](https://opencollective.com/webpack#backer)
[![sponsors](https://opencollective.com/webpack/sponsors/badge.svg)](https://opencollective.com/webpack#sponsors)
[![contributors](https://img.shields.io/github/contributors/webpack/webpack.svg)](https://github.com/webpack/webpack/graphs/contributors)
[![discussions](https://img.shields.io/github/discussions/webpack/webpack)](https://github.com/webpack/webpack/discussions)
[![discord](https://img.shields.io/discord/1180618526436888586?label=discord&logo=discord&logoColor=white&style=flat)](https://discord.gg/webpack)
[![LFX Health Score](https://insights.linuxfoundation.org/api/badge/health-score?project=webpack)](https://insights.linuxfoundation.org/project/webpack)
[![Agent Friendly](https://agentfriendlycode.com/api/badge/github/webpack/webpack.svg)](https://agentfriendlycode.com/repo/12618)

  <h1>webpack</h1>
  <p>
    Webpack is a module bundler. Its main purpose is to bundle JavaScript files for usage in a browser, yet it is also capable of transforming, bundling, or packaging just about any resource or asset.
  </p>
</div>

## Table of Contents

- [Install](#install)
- [Introduction](#introduction)
- [Concepts](#concepts)
- [Contributing](#contributing)
- [Support](#support)
- [Current project members](#current-project-members)
  - [TSC (Technical Steering Committee)](#tsc-technical-steering-committee)
  - [Core Collaborators](#core-collaborators)
- [Sponsoring](#sponsoring)
  - [Premium Partners](#premium-partners)
  - [Gold Sponsors](#gold-sponsors)
  - [Silver Sponsors](#silver-sponsors)
  - [Bronze Sponsors](#bronze-sponsors)
  - [Backers](#backers)
- [Special Thanks](#special-thanks-to)

## Install

Install with npm:

```bash
npm install --save-dev webpack
```

Install with yarn:

```bash
yarn add webpack --dev
```

## Introduction

Webpack is a bundler for modules. The main purpose is to bundle JavaScript
files for usage in a browser, yet it is also capable of transforming, bundling,
or packaging just about any resource or asset.

**TL;DR**

- Bundles [ES Modules](https://www.2ality.com/2014/09/es6-modules-final.html), [CommonJS](https://wiki.commonjs.org/), and [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules (even combined).
- Can create a single bundle or multiple chunks that are asynchronously loaded at runtime (to reduce initial loading time).
- Dependencies are resolved during compilation, reducing the runtime size.
- Loaders can preprocess files while compiling, e.g. TypeScript to JavaScript, Handlebars strings to compiled functions, images to Base64, etc.
- Highly modular plugin system to do whatever else your application requires.

#### Learn about webpack through videos!

- [Understanding Webpack - Video 1](https://www.youtube.com/watch?v=xj93pvQIsRo)
- [Understanding Webpack - Video 2](https://www.youtube.com/watch?v=4tQiJaFzuJ8)

### Get Started

Check out webpack's quick [**Get Started**](https://webpack.js.org/guides/getting-started) guide and the [other guides](https://webpack.js.org/guides/).

### Browser Compatibility

Webpack supports all browsers that are [ES5-compliant](https://kangax.github.io/compat-table/es5/) (IE8 and below are not supported).
Webpack also needs `Promise` for `import()` and `require.ensure()`. If you want to support older browsers, you will need to [load a polyfill](https://webpack.js.org/guides/shimming/) before using these expressions.

## Concepts

### [Plugins](https://webpack.js.org/plugins/)

Webpack has a [rich plugin
interface](https://webpack.js.org/plugins/). Most of the features
within webpack itself use this plugin interface. This makes webpack very
**flexible**.

Webpack can generate HTML pages and extract CSS files itself, both experimental —
see what that covers, and what still needs a plugin, for
[CSS](https://webpack.js.org/guides/native-css/#whats-built-in) and
[HTML](https://webpack.js.org/guides/native-html/#whats-built-in).

|                   Name                    |       Status       |    Install Size     | Description                                                                             |
| :---------------------------------------: | :----------------: | :-----------------: | :-------------------------------------------------------------------------------------- |
| [compression-webpack-plugin][compression] | ![compression-npm] | ![compression-size] | Prepares compressed versions of assets to serve them with Content-Encoding              |
|  [html-bundler-webpack-plugin][bundler]   |   ![bundler-npm]   |   ![bundler-size]   | Renders a template (EJS, Handlebars, Pug) with referenced source asset files into HTML. |
|         [pug-plugin][pug-plugin]          | ![pug-plugin-npm]  | ![pug-plugin-size]  | Renders Pug files to HTML, extracts JS and CSS from sources specified directly in Pug.  |

[common-npm]: https://img.shields.io/npm/v/webpack.svg
[component]: https://github.com/webpack-contrib/component-webpack-plugin
[component-npm]: https://img.shields.io/npm/v/component-webpack-plugin.svg
[component-size]: https://packagephobia.com/badge?p=component-webpack-plugin
[compression]: https://github.com/webpack-contrib/compression-webpack-plugin
[compression-npm]: https://img.shields.io/npm/v/compression-webpack-plugin.svg
[compression-size]: https://packagephobia.com/badge?p=compression-webpack-plugin
[bundler]: https://github.com/webdiscus/html-bundler-webpack-plugin
[bundler-npm]: https://img.shields.io/npm/v/html-bundler-webpack-plugin.svg
[bundler-size]: https://packagephobia.com/badge?p=html-bundler-webpack-plugin
[pug-plugin]: https://github.com/webdiscus/pug-plugin
[pug-plugin-npm]: https://img.shields.io/npm/v/pug-plugin.svg
[pug-plugin-size]: https://packagephobia.com/badge?p=pug-plugin

### [Loaders](https://webpack.js.org/loaders/)

Webpack enables the use of loaders to preprocess files. This allows you to bundle
**any static resource** way beyond JavaScript. You can easily [write your own
loaders](https://webpack.js.org/api/loaders/) using Node.js.

Loaders are activated by using `loadername!` prefixes in `require()` statements,
or are automatically applied via regex from your webpack configuration.

JavaScript, JSON and [assets](https://webpack.js.org/guides/asset-modules/) need no
loader, and [CSS](https://webpack.js.org/guides/native-css/#whats-built-in) and
[HTML](https://webpack.js.org/guides/native-html/#whats-built-in) have experimental
built-in support — but preprocessors and template engines keep their loaders.

#### JSON

|                                                                                       Name                                                                                       |   Status    | Install Size |           Description            |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------: | :----------: | :------------------------------: |
| <a href="https://github.com/awnist/cson-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/coffeescript/coffeescript-original.svg"></a> | ![cson-npm] | ![cson-size] | Loads and transpiles a CSON file |

[cson-npm]: https://img.shields.io/npm/v/cson-loader.svg
[cson-size]: https://packagephobia.com/badge?p=cson-loader

#### Transpiling

|                                                                                                                             Name                                                                                                                             |    Status     |  Install Size  | Description                                                                                       |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------: | :------------: | :------------------------------------------------------------------------------------------------ |
|                                   <a href="https://github.com/babel/babel-loader"><img width="48" height="48" title="babel-loader" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/babel/babel-original.svg"></a>                                    | ![babel-npm]  | ![babel-size]  | Loads ES2015+ code and transpiles to ES5 using <a href="https://github.com/babel/babel">Babel</a> |
| <a href="https://github.com/TypeStrong/ts-loader"><img width="48" height="48" src="https://raw.githubusercontent.com/microsoft/TypeScript-Website/f407e1ae19e5e990d9901ac8064a32a8cc60edf0/packages/typescriptlang-org/static/branding/ts-logo-128.svg"></a> |  ![type-npm]  |  ![type-size]  | Loads TypeScript like JavaScript                                                                  |
|                                 <a href="https://github.com/webpack-contrib/coffee-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/coffeescript/coffeescript-original.svg"></a>                                  | ![coffee-npm] | ![coffee-size] | Loads CoffeeScript like JavaScript                                                                |

[babel-npm]: https://img.shields.io/npm/v/babel-loader.svg
[babel-size]: https://packagephobia.com/badge?p=babel-loader
[coffee-npm]: https://img.shields.io/npm/v/coffee-loader.svg
[coffee-size]: https://packagephobia.com/badge?p=coffee-loader
[type-npm]: https://img.shields.io/npm/v/ts-loader.svg
[type-size]: https://packagephobia.com/badge?p=ts-loader

#### Templating

|                                                                                         Name                                                                                         |     Status      |   Install Size   | Description                                                                             |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-------------: | :--------------: | :-------------------------------------------------------------------------------------- |
|      <a href="https://github.com/webdiscus/pug-loader"><img width="48" height="48" src="https://cdn.rawgit.com/pugjs/pug-logo/master/SVG/pug-final-logo-_-colour-128.svg"></a>       |   ![pug-npm]    |   ![pug-size]    | Compiles Pug to a function or HTML string, useful for use with Vue, React, Angular      |
|    <a href="https://github.com/peerigon/markdown-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/markdown/markdown-original.svg"></a>    |    ![md-npm]    |    ![md-size]    | Compiles Markdown to HTML                                                               |
|                      <a href="https://github.com/posthtml/posthtml-loader"><img width="48" height="48" src="https://posthtml.github.io/posthtml/logo.svg"></a>                       | ![posthtml-npm] | ![posthtml-size] | Loads and transforms a HTML file using [PostHTML](https://github.com/posthtml/posthtml) |
| <a href="https://github.com/pcardune/handlebars-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/handlebars/handlebars-original.svg"></a> |   ![hbs-npm]    |   ![hbs-size]    | Compiles Handlebars to HTML                                                             |

[pug-npm]: https://img.shields.io/npm/v/@webdiscus/pug-loader.svg
[pug-size]: https://packagephobia.com/badge?p=@webdiscus/pug-loader
[jade-npm]: https://img.shields.io/npm/v/jade-loader.svg
[jade-size]: https://packagephobia.com/badge?p=jade-loader
[md-npm]: https://img.shields.io/npm/v/markdown-loader.svg
[md-size]: https://packagephobia.com/badge?p=markdown-loader
[posthtml-npm]: https://img.shields.io/npm/v/posthtml-loader.svg
[posthtml-size]: https://packagephobia.com/badge?p=posthtml-loader
[hbs-npm]: https://img.shields.io/npm/v/handlebars-loader.svg
[hbs-size]: https://packagephobia.com/badge?p=handlebars-loader

#### Styling

|                                                                                      Name                                                                                       |     Status     |  Install Size   | Description                                                              |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------: | :-------------: | :----------------------------------------------------------------------- |
| <a href="https://github.com/webpack-contrib/less-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/less/less-plain-wordmark.svg"></a> |  ![less-npm]   |  ![less-size]   | Loads and compiles a LESS file                                           |
|    <a href="https://github.com/webpack-contrib/sass-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg"></a>    |  ![sass-npm]   |  ![sass-size]   | Loads and compiles a Sass/SCSS file                                      |
|      <a href="https://github.com/shama/stylus-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/stylus/stylus-original.svg"></a>      | ![stylus-npm]  | ![stylus-size]  | Loads and compiles a Stylus file                                         |
|   <a href="https://github.com/postcss/postcss-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postcss/postcss-original.svg"></a>    | ![postcss-npm] | ![postcss-size] | Loads and transforms a CSS/SSS file using [PostCSS](https://postcss.org) |

[less-npm]: https://img.shields.io/npm/v/less-loader.svg
[less-size]: https://packagephobia.com/badge?p=less-loader
[sass-npm]: https://img.shields.io/npm/v/sass-loader.svg
[sass-size]: https://packagephobia.com/badge?p=sass-loader
[stylus-npm]: https://img.shields.io/npm/v/stylus-loader.svg
[stylus-size]: https://packagephobia.com/badge?p=stylus-loader
[postcss-npm]: https://img.shields.io/npm/v/postcss-loader.svg
[postcss-size]: https://packagephobia.com/badge?p=postcss-loader

#### Frameworks

|                                                                                                    Name                                                                                                     |     Status     |  Install Size   | Description                                                                                            |
| :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------: | :-------------: | :----------------------------------------------------------------------------------------------------- |
|                      <a href="https://github.com/vuejs/vue-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg"></a>                       |   ![vue-npm]   |   ![vue-size]   | Loads and compiles Vue Components                                                                      |
| <a href="https://github.com/webpack-contrib/polymer-webpack-loader"><img width="48" height="48" src="https://raw.githubusercontent.com/Polymer/polymer-project.org/master/app/images/logos/p-logo.svg"></a> | ![polymer-npm] | ![polymer-size] | Process HTML & CSS with preprocessor of choice and `require()` Web Components like first-class modules |
|         <a href="https://github.com/TheLarkInn/angular2-template-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg"></a>         | ![angular-npm] | ![angular-size] | Loads and compiles Angular 2 Components                                                                |
|                                     <a href="https://github.com/riot/webpack-loader"><img width="48" height="48" src="https://riot.js.org/img/logo/riot-logo.svg"></a>                                      |  ![riot-npm]   |  ![riot-size]   | Riot official webpack loader                                                                           |
|                  <a href="https://github.com/sveltejs/svelte-loader"><img width="48" height="48" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg"></a>                   | ![svelte-npm]  | ![svelte-size]  | Official Svelte loader                                                                                 |

[vue-npm]: https://img.shields.io/npm/v/vue-loader.svg
[vue-size]: https://packagephobia.com/badge?p=vue-loader
[polymer-npm]: https://img.shields.io/npm/v/polymer-webpack-loader.svg
[polymer-size]: https://packagephobia.com/badge?p=polymer-webpack-loader
[angular-npm]: https://img.shields.io/npm/v/angular2-template-loader.svg
[angular-size]: https://packagephobia.com/badge?p=angular2-template-loader
[riot-npm]: https://img.shields.io/npm/v/riot-tag-loader.svg
[riot-size]: https://packagephobia.com/badge?p=riot-tag-loader
[svelte-npm]: https://img.shields.io/npm/v/svelte-loader.svg
[svelte-size]: https://packagephobia.com/badge?p=svelte-loader

### Performance

Webpack uses async I/O and has multiple caching levels. This makes webpack fast
and incredibly **fast** on incremental compilations.

### Module Formats

Webpack supports ES2015+, CommonJS and AMD modules **out of the box**. It performs clever static
analysis on the AST of your code. It even has an evaluation engine to evaluate
simple expressions. This allows you to **support most existing libraries** out of the box.

### [Code Splitting](https://webpack.js.org/guides/code-splitting/)

Webpack allows you to split your codebase into multiple chunks. Chunks are
loaded asynchronously at runtime. This reduces the initial loading time.

### [Optimizations](https://webpack.js.org/guides/production-build/)

Webpack can do many optimizations to **reduce the output size of your
JavaScript** by deduplicating frequently used modules, minifying, and giving
you full control of what is loaded initially and what is loaded at runtime
through code splitting. It can also make your code chunks **cache
friendly** by using hashes.

### Developer Tools

If you're working on webpack itself, or building advanced plugins or integrations, the tools below can help you explore internal mechanics, debug plugin life-cycles, and build custom tooling.

#### Instrumentation

| Name                                                      | Status                | Description                                                                                                                       |
| --------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| [tapable-tracer](https://github.com/ertgl/tapable-tracer) | ![tapable-tracer-npm] | Traces tapable hook execution in real-time and collects structured stack frames. Can export to UML for generating visualizations. |

[tapable-tracer-npm]: https://img.shields.io/npm/v/tapable-tracer.svg

## Contributing

**We want contributing to webpack to be fun, enjoyable, and educational for anyone, and everyone.** We have a [vibrant ecosystem](https://medium.com/webpack/contributors-guide/home) that spans beyond this single repo. We welcome you to check out any of the repositories in [our organization](https://github.com/webpack) or [webpack-contrib organization](https://github.com/webpack-contrib) which houses all of our loaders and plugins.

Contributions go far beyond pull requests and commits. Although we love giving you the opportunity to put your stamp on webpack, we also are thrilled to receive a variety of other contributions including:

- [Documentation](https://github.com/webpack/webpack.js.org) updates, enhancements, designs, or bugfixes
- Spelling or grammar fixes
- README.md corrections or redesigns
- Adding unit, or functional tests
- Triaging GitHub issues -- especially determining whether an issue still persists or is reproducible.
- [Searching #webpack on twitter](https://twitter.com/search?q=webpack) and helping someone else who needs help
- Teaching others how to contribute to one of the many webpack's repos!
- [Blogging, speaking about, or creating tutorials](https://github.com/webpack-contrib/awesome-webpack) about one of webpack's many features.
- Helping others in our webpack [gitter channel](https://gitter.im/webpack/webpack).
- [The Contributor's Guide to webpack](https://medium.com/webpack/contributors-guide/home)

To get started have a look at our [documentation on contributing](https://github.com/webpack/webpack/blob/main/CONTRIBUTING.md).

For when your change reaches npm, see [RELEASE_SCHEDULE.md](./RELEASE_SCHEDULE.md) — patch releases go out as soon as possible, minor releases every 4 weeks on Thursday.

### Creating your own plugins and loaders

If you create a loader or plugin, we would <3 for you to open source it, and put it on npm. We follow the `x-loader`, `x-webpack-plugin` naming convention.

## Support

We consider webpack to be a low-level tool used not only individually but also layered beneath other awesome tools. Because of its flexibility, webpack isn't always the _easiest_ entry-level solution, however we do believe it is the most powerful. That said, we're always looking for ways to improve and simplify the tool without compromising functionality. If you have any ideas on ways to accomplish this, we're all ears!

If you're just getting started, take a look at [our new docs and concepts page](https://webpack.js.org/concepts/). This has a high level overview that is great for beginners!!

If you have discovered a 🐜 or have a feature suggestion, feel free to create an issue on GitHub.

## Current project members

For information about the governance of the webpack project, see [GOVERNANCE.md](./GOVERNANCE.md).

### TSC (Technical Steering Committee)

- [alexander-akait](https://github.com/alexander-akait) -
  **Alexander Akait** <<sheo13666q@gmail.com>> (he/him)
- [avivkeller](https://github.com/avivkeller) -
  **Aviv Keller** <<me@aviv.sh>> (he/him)
- [evenstensberg](https://github.com/evenstensberg) -
  **Even Stensberg** <<evenstensberg@gmail.com>> (he/him)
- [thelarkinn](https://github.com/thelarkinn) -
  **Sean Larkin** <<selarkin@microsoft.com>> (he/him)
- [xiaoxiaojx](https://github.com/xiaoxiaojx) -
  **Natsu Xiao** <<xiaojiaixn@gmail.com>> (he/him)
- [hai-x](https://github.com/hai-x) -
  **Haijie Xie** <<haijie0619@gmail.com>> (he/him)

### Maintenance

This webpack repository is maintained by the [`Core Working Group`](./WORKING_GROUP.md).

## Sponsoring

Most of the core team members, webpack contributors and contributors in the ecosystem do this open source work in their free time. If you use webpack for a serious task, and you'd like us to invest more time on it, please donate. This project increases your income/productivity too. It makes development and applications faster and it reduces the required bandwidth.

This is how we use the donations:

- Allow the core team to work on webpack
- Thank contributors if they invested a large amount of time in contributing
- Support projects in the ecosystem that are of great value for users
- Support projects that are voted most (work in progress)
- Infrastructure cost
- Fees for money handling

### Premium Partners

<div align="center">

<a href="https://www.ag-grid.com/?utm_source=webpack&utm_medium=banner&utm_campaign=sponsorship" target="_blank"><img align="center" src="https://raw.githubusercontent.com/webpack/media/2b399d58/horiz-banner-ad-ag-grid.png">
</a>

</div>

### Other Backers and Sponsors

Before we started using OpenCollective, donations were made anonymously. Now that we have made the switch, we would like to acknowledge these sponsors (and the ones who continue to donate using OpenCollective). If we've missed someone, please send us a PR, and we'll add you to this list.

<div align="center">

<a href="https://angular.io/" target="_blank" title="JS framework">Angular</a>
<a href="https://moonmail.io" target="_blank" title="Email Marketing Software">MoonMail</a>
<a href="https://monei.net" target="_blank" title="Best payment gateway rates">MONEI</a>

</div>

### Sponsors and Backers

Thank you to everyone who supports webpack through [Open Collective](https://opencollective.com/webpack).

[![webpack sponsors and backers](https://webpack.js.org/assets/sponsors.svg)](https://opencollective.com/webpack)

## Other Partners

- [CodSpeed](https://codspeed.io/?utm_source=webpack&utm_medium=readme) for generously supporting us with benchmarks on their paid runners.

## Special Thanks to

<p>(In chronological order)</p>

- [@google](https://github.com/google) for [Google Web Toolkit (GWT)](https://www.gwtproject.org/), which aims to compile Java to JavaScript. It features a similar [Code Splitting](https://www.gwtproject.org/doc/latest/DevGuideCodeSplitting.html) as webpack.
- [@medikoo](https://github.com/medikoo) for [modules-webmake](https://github.com/medikoo/modules-webmake), which is a similar project. webpack was born because of the desire for code splitting for modules such as Webmake. Interestingly, the [Code Splitting issue is still open](https://github.com/medikoo/modules-webmake/issues/7) (thanks also to @Phoscur for the discussion).
- [@substack](https://github.com/substack) for [browserify](https://browserify.org/), which is a similar project and source for many ideas.
- [@jrburke](https://github.com/jrburke) for [require.js](https://requirejs.org/), which is a similar project and source for many ideas.
- [@defunctzombie](https://github.com/defunctzombie) for the [browser-field spec](https://github.com/defunctzombie/package-browser-field-spec), which makes modules available for node.js, browserify and webpack.
- [@sokra](https://github.com/sokra) for creating webpack.
- Every early webpack user, which contributed to webpack by writing issues or PRs. You influenced the direction.
- All past and current webpack maintainers and collaborators.
- Everyone who has written a loader for webpack. You are the ecosystem...
- Everyone not mentioned here but that has also influenced webpack.

[npm]: https://img.shields.io/npm/v/webpack.svg
[npm-url]: https://npmjs.com/package/webpack
[node]: https://img.shields.io/node/v/webpack.svg
[node-url]: https://nodejs.org
[prs]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg
[prs-url]: https://webpack.js.org/contribute/
[builds1]: https://github.com/webpack/webpack/actions/workflows/test.yml/badge.svg
[builds1-url]: https://github.com/webpack/webpack/actions/workflows/test.yml
[dependency-review-url]: https://github.com/webpack/webpack/actions/workflows/dependency-review.yml
[dependency-review]: https://github.com/webpack/webpack/actions/workflows/dependency-review.yml/badge.svg
[cover]: https://codecov.io/gh/webpack/webpack/graph/badge.svg?token=mDP3mQJNnn
[cover-url]: https://codecov.io/gh/webpack/webpack
