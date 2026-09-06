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
[![discord](https://img.shields.io/discord/1180618526436888586?label=discord&logo=discord&logoColor=white&style=flat)](https://discord.gg/5sxFZPdx2k)
[![LFX Health Score](https://insights.linuxfoundation.org/api/badge/health-score?project=webpack)](https://insights.linuxfoundation.org/project/webpack)

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

### Gold Sponsors

[Become a gold sponsor](https://opencollective.com/webpack#sponsor) and get your logo on our README on GitHub with a link to your site.

<div align="center">

<a href="https://opencollective.com/webpack/sponsor/0/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/0/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/1/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/1/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/2/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/2/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/3/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/3/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/4/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/4/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/5/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/5/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/6/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/6/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/7/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/7/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/8/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/8/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/9/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/9/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/10/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/10/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/11/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/11/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/12/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/12/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/13/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/13/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/14/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/14/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/15/website?requireActive=false" target="_blank"><img width="150" src="https://opencollective.com/webpack/sponsor/15/avatar.svg?requireActive=false"></a>

</div>

### Silver Sponsors

[Become a silver sponsor](https://opencollective.com/webpack#sponsor) and get your logo on our README on GitHub with a link to your site.

<div align="center">

<a href="https://opencollective.com/webpack/sponsor/16/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/16/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/17/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/17/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/18/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/18/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/19/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/19/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/20/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/20/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/21/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/21/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/22/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/22/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/23/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/23/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/24/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/24/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/25/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/25/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/26/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/26/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/27/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/27/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/28/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/28/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/29/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/29/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/30/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/30/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/31/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/31/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/32/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/32/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/33/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/33/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/34/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/34/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/35/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/35/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/36/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/36/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/37/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/37/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/38/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/38/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/39/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/39/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/40/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/40/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/41/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/41/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/42/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/42/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/43/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/43/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/44/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/44/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/45/website?requireActive=false" target="_blank"><img width="120" src="https://opencollective.com/webpack/sponsor/45/avatar.svg?requireActive=false"></a>

</div>

### Bronze Sponsors

[Become a bronze sponsor](https://opencollective.com/webpack#sponsor) and get your logo on our README on GitHub with a link to your site.

<div align="center">

<a href="https://opencollective.com/webpack/sponsor/46/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/46/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/47/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/47/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/48/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/48/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/49/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/49/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/50/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/50/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/51/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/51/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/52/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/52/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/53/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/53/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/54/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/54/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/55/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/55/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/56/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/56/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/57/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/57/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/58/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/58/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/59/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/59/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/60/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/60/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/61/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/61/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/62/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/62/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/63/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/63/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/64/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/64/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/65/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/65/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/66/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/66/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/67/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/67/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/68/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/68/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/69/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/69/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/70/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/70/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/71/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/71/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/72/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/72/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/73/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/73/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/74/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/74/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/75/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/75/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/76/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/76/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/77/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/77/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/78/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/78/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/79/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/79/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/80/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/80/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/81/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/81/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/82/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/82/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/83/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/83/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/84/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/84/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/85/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/85/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/86/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/86/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/87/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/87/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/88/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/88/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/89/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/89/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/90/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/90/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/91/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/91/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/92/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/92/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/93/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/93/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/94/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/94/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/95/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/95/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/96/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/96/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/97/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/97/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/98/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/98/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/99/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/99/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/100/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/100/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/101/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/101/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/102/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/102/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/103/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/103/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/104/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/104/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/105/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/105/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/106/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/106/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/107/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/107/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/108/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/108/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/109/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/109/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/110/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/110/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/111/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/111/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/112/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/112/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/113/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/113/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/114/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/114/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/115/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/115/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/116/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/116/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/117/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/117/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/118/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/118/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/119/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/119/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/120/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/120/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/121/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/121/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/122/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/122/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/123/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/123/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/124/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/124/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/125/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/125/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/126/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/126/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/127/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/127/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/128/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/128/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/129/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/129/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/130/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/130/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/131/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/131/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/132/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/132/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/133/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/133/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/134/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/134/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/135/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/135/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/136/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/136/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/137/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/137/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/138/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/138/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/139/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/139/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/140/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/140/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/141/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/141/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/142/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/142/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/143/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/143/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/144/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/144/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/145/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/145/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/sponsor/146/website?requireActive=false" target="_blank"><img width="100" src="https://opencollective.com/webpack/sponsor/146/avatar.svg?requireActive=false"></a>

</div>

### Backers

[Become a backer](https://opencollective.com/webpack#backer) and get your image on our README on GitHub with a link to your site.

<a href="https://opencollective.com/webpack/backer/0/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/0/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/1/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/1/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/2/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/2/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/3/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/3/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/4/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/4/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/5/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/5/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/6/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/6/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/7/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/7/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/8/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/8/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/9/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/9/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/10/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/10/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/11/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/11/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/12/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/12/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/13/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/13/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/14/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/14/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/15/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/15/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/16/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/16/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/17/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/17/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/18/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/18/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/19/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/19/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/20/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/20/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/21/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/21/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/22/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/22/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/23/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/23/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/24/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/24/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/25/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/25/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/26/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/26/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/27/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/27/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/28/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/28/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/29/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/29/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/30/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/30/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/31/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/31/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/32/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/32/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/33/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/33/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/34/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/34/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/35/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/35/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/36/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/36/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/37/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/37/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/38/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/38/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/39/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/39/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/40/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/40/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/41/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/41/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/42/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/42/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/43/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/43/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/44/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/44/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/45/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/45/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/46/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/46/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/47/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/47/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/48/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/48/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/49/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/49/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/50/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/50/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/51/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/51/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/52/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/52/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/53/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/53/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/54/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/54/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/55/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/55/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/56/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/56/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/57/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/57/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/58/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/58/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/59/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/59/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/60/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/60/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/61/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/61/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/62/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/62/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/63/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/63/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/64/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/64/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/65/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/65/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/66/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/66/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/67/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/67/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/68/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/68/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/69/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/69/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/70/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/70/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/71/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/71/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/72/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/72/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/73/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/73/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/74/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/74/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/75/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/75/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/76/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/76/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/77/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/77/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/78/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/78/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/79/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/79/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/80/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/80/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/81/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/81/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/82/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/82/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/83/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/83/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/84/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/84/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/85/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/85/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/86/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/86/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/87/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/87/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/88/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/88/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/89/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/89/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/90/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/90/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/91/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/91/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/92/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/92/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/93/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/93/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/94/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/94/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/95/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/95/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/96/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/96/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/97/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/97/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/98/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/98/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/99/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/99/avatar.svg?requireActive=false"></a>
<a href="https://opencollective.com/webpack/backer/100/website?requireActive=false" target="_blank"><img width="30" src="https://opencollective.com/webpack/backer/100/avatar.svg?requireActive=false"></a>

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


## 🌐 Web Resources & Interactive Index
- [CATEGORY MOUSE1 697](https://theskillquest.pages.dev/category-mouse1-697.html)
- [MERGE FELLAS ONLINE](https://studyplaying.github.io/merge-fellas-online.html)
- [SUV TRAFFIC RACER](https://studyquesthub.web.app/suv-traffic-racer.html)
- [AROUND ELBRUS](https://quizverses.github.io/around-elbrus.html)
- [KITTY SQUAD WINTER DRESS UP](https://thelearnquester.web.app/kitty-squad-winter-dress-up.html)
- [EMOJI SORT FUN PUZZLE GAME](https://quizverses.github.io/emoji-sort-fun-puzzle-game.html)
- [VIRTUAL NEKO KITTY COLLECTOR](https://studyquesthub.web.app/virtual-neko-kitty-collector.html)
- [CONTACT](https://quizverses.github.io/contact.html)
- [DRIVE TO SURVIVE](https://studyplayings.pages.dev/drive-to-survive.html)
- [FOOTBALL PENALTY](https://learnquester.github.io/football-penalty.html)
- [CATEGORY TURN BASED30](https://studyquesthub.web.app/category-turn-based30.html)
- [CATEGORY DESTROY](https://quizverses.github.io/category-destroy.html)
- [SITEMAP](https://brainquests.onrender.com/sitemap.html)
- [SQUID ESCAPE BUT BLOCKWORLD](https://thelearnquester.web.app/squid-escape-but-blockworld.html)
- [CARGO SKATES](https://studyplayings.pages.dev/cargo-skates.html)
- [THE COUNTERFEIT BANK](https://learnquester.pages.dev/the-counterfeit-bank.html)
- [DREAM WEDDING PLANNER](https://thelearnquester.web.app/dream-wedding-planner.html)
- [100 DOORS CHALLENGE](https://quizverses.github.io/100-doors-challenge.html)
- [DAN THE MAN](https://studyplaying.github.io/dan-the-man.html)
- [STEAL ITEMS IO](https://studyplayings.pages.dev/steal-items-io.html)
- [TOILET TIME](https://studyplaying.github.io/toilet-time.html)
- [TERMS](https://cryptotify.github.io/terms.html)
- [GARDEN GUARDIANS](https://quizverses.github.io/garden-guardians.html)
- [MINE 2D SURVIVAL HEROBRINE](https://studyplaying.github.io/mine-2d-survival-herobrine.html)
- [EMILYS HOTEL SOLITAIRE](https://thelearnquester.web.app/emilys-hotel-solitaire.html)
- [MOON LEAGUE SPORTS SEASON](https://studyplayings.pages.dev/moon-league-sports-season.html)
- [PLANET TAKEOVER](https://studyplaying.github.io/planet-takeover.html)
- [CATEGORY SOCCER](https://studyquests.pages.dev/category-soccer.html)
- [WHEEL OF BINGO](https://thelearnquester.web.app/wheel-of-bingo.html)
- [CATEGORY CASUAL 2](https://quizverses.github.io/category-casual-2.html)
- [SHEEP SORT PUZZLE SORT COLOR](https://studyplaying.github.io/sheep-sort-puzzle-sort-color.html)
- [X TO Y ALMOST IMPOSSIBLE](https://quizverses.github.io/x-to-y-almost-impossible.html)
- [FOOD CARD SORT](https://studyquests.github.io/food-card-sort.html)
- [MAGIC FINGER](https://learnquesters.pages.dev/magic-finger.html)
- [PINTURILLO](https://studyplayings.pages.dev/pinturillo.html)
- [2048 MERGE CIRCLE](https://quizverses.pages.dev/2048-merge-circle.html)
- [CATEGORY CASUAL971](https://studyquesthub.web.app/category-casual971.html)
- [TRUE LOVE CALCULATOR NZW](https://thelearnquester.web.app/true-love-calculator-nzw.html)
- [UNPUZZLE MASTER](https://quizverses.pages.dev/unpuzzle-master.html)
- [BRAINROT BOING BOING MERGE](https://studyquests.github.io/brainrot-boing-boing-merge.html)
- [TOCA AVATAR MY HOSPITAL](https://quizverses-9d2f2.web.app/toca-avatar-my-hospital.html)
- [DRIFTCLICKER](https://studyquests.github.io/driftclicker.html)
- [XIBLBA MATCH](https://learnquesters.pages.dev/xiblba-match.html)
- [ROBYBOX SPACE STATION WAREHOUSE](https://studyplaying.github.io/robybox-space-station-warehouse.html)
- [2048 MERGE WORLD](https://studyplayings.web.app/2048-merge-world.html)
- [CATEGORY CASUAL 5](https://studyplayings.web.app/category-casual-5.html)
- [BLACK PINK STPATRICKS DAY CONCERT](https://studyplaying.github.io/black-pink-stpatricks-day-concert.html)
- [PAPAS BURGER COOK](https://studyquesthub.web.app/papas-burger-cook.html)
- [BLOCK MANIA](https://studyquests.pages.dev/block-mania.html)
- [STICKMAN ARCHERO FIGHT STICK SHADOW FIGHT WAR](https://thelearnquester.web.app/stickman-archero-fight-stick-shadow-fight-war.html)
- [CATEGORY MATCH 3](https://studyplayings.web.app/category-match-3.html)
- [MIRACLE MAHJONG](https://studyquests.github.io/miracle-mahjong.html)
- [GEOMETRY STARS](https://studyquests.github.io/geometry-stars.html)
- [REAL PARKOUR SIMULATOR](https://studyquesthub.web.app/real-parkour-simulator.html)
- [CATEGORY INCREMENTAL](https://thelearnquester.web.app/category-incremental.html)
- [ECO BLOCK PUZZLE](https://quizverses.github.io/eco-block-puzzle.html)
- [CATEGORY SPORTS](https://studyplayings.web.app/category-sports.html)
- [GLOBAL CITY QKK](https://studyplaying.github.io/global-city-qkk.html)
- [TINY FOOTBALL CUP 2026](https://studyquests.github.io/tiny-football-cup-2026.html)
- [NUMBER MASTER RUN AND MERGE](https://thelearnquester.web.app/number-master-run-and-merge.html)
- [BOMB HEAD HOT POTATO](https://learnquesters.pages.dev/bomb-head-hot-potato.html)
- [INDEX11](https://thelearnquesters.pages.dev/index11.html)
- [CATEGORY CAR](https://studyplayings.web.app/category-car.html)
- [BUILDING MODS FOR MINECRAFT](https://studyplaying.github.io/building-mods-for-minecraft.html)
- [UPHILL RUSH 13](https://studyquests.pages.dev/uphill-rush-13.html)
- [CATEGORY AGILITY 3](https://quizverses.github.io/category-agility-3.html)
- [DUMMIES WORLD CUP](https://studyquests.github.io/dummies-world-cup.html)
- [MUSCLE CHALLENGE](https://learnquesters.pages.dev/muscle-challenge.html)
- [TIC TAC TOE MATCH THREE](https://thelearnquester.web.app/tic-tac-toe-match-three.html)
- [THE LAST TIGER TANK SIMULATOR](https://quizverses.pages.dev/the-last-tiger-tank-simulator.html)
- [BALL SORT](https://quizverses.pages.dev/ball-sort.html)
- [CATEGORY MAKEUP](https://studyplayings.web.app/category-makeup.html)
- [MR LONG LEGS](https://studyquesthub.web.app/mr-long-legs.html)
- [MAGNET TRUCK](https://studyplayings.pages.dev/magnet-truck.html)
- [LITTLE LILY HALLOWEEN PREP](https://learnquester.github.io/little-lily-halloween-prep.html)
- [NATURAL DISASTER SURVIVAL OBBY](https://thelearnquester.web.app/natural-disaster-survival-obby.html)
- [INDEX2](https://studyquesthub.web.app/index2.html)
- [KAWAII CLAW MERGE](https://quizverses.pages.dev/kawaii-claw-merge.html)
- [CATEGORY CARTOON](https://studyplayings.web.app/category-cartoon.html)
- [FAST BALL JUMP](https://learnquesters.pages.dev/fast-ball-jump.html)
- [MERMAID PRINCESS AVATER CASTLE](https://learnquester.github.io/mermaid-princess-avater-castle.html)
- [TENTRIX](https://studyplaying.github.io/tentrix.html)
- [LIVE STAR DOLL DRESS UP](https://thelearnquester.web.app/live-star-doll-dress-up.html)
- [ROBYBOX SPACE STATION WAREHOUSE](https://thelearnquester.web.app/robybox-space-station-warehouse.html)
- [SITEMAP](https://cryptotify.vercel.app/sitemap.html)
- [MICROPLASTICS FEEDING](https://quizverses.pages.dev/microplastics-feeding.html)
- [WORD SCRAMBLE FAMILY TALES](https://studyquesthub.web.app/word-scramble-family-tales.html)
- [FUN MINI GAMES FOR KIDS](https://studyquests.github.io/fun-mini-games-for-kids.html)
- [BOUNCEPOP QUEST](https://studyplayings.pages.dev/bouncepop-quest.html)
- [MINI GRAND THEFT CITY](https://quizverses.pages.dev/mini-grand-theft-city.html)
- [ELLIE AND FRIENDS VENICE CARNIVAL](https://learnquesters.pages.dev/ellie-and-friends-venice-carnival.html)
- [CATEGORY SURVIVAL366](https://studyquesthub.web.app/category-survival366.html)
- [INDEX16](https://studyquesthub.web.app/index16.html)
- [SNAKELANDSIO](https://quizverses.pages.dev/snakelandsio.html)
- [FOXY ECO SORT](https://studyquests.pages.dev/foxy-eco-sort.html)
- [CATEGORY CASUAL](https://studyplayings.web.app/category-casual.html)
- [ARROW COUNT MASTER](https://studyplayings.pages.dev/arrow-count-master.html)
- [MERGE PLANETS](https://quizverses.pages.dev/merge-planets.html)
- [SKYSCRAPER TO THE SKY](https://studyquests.pages.dev/skyscraper-to-the-sky.html)
- [SINGLE STROKE ENERGY LINE PUZZLE](https://studyquests.pages.dev/single-stroke-energy-line-puzzle.html)
- [SAVE BABY CAPYBARAS PULL PIN](https://studyplaying.github.io/save-baby-capybaras-pull-pin.html)
- [CATEGORY CASUAL 5](https://studyplayings.pages.dev/category-casual-5.html)
- [SPRUNKI CHARACTER MAKER OC](https://studyplayings.pages.dev/sprunki-character-maker-oc.html)
- [CATEGORY POOL 2](https://studyplayings.web.app/category-pool-2.html)
- [BOXTERIA](https://learnquesters.pages.dev/boxteria.html)
- [CATEGORY FPS](https://studyquests.github.io/category-fps.html)
- [MOJO MATCH 3D](https://learnquesters.pages.dev/mojo-match-3d.html)
- [CATEGORY SOLITAIRE27](https://studyplayings.web.app/category-solitaire27.html)
- [INDEX18](https://studyquesthub.web.app/index18.html)
- [CATEGORY RPG80](https://quizverses-9d2f2.web.app/category-rpg80.html)
- [CATEGORY MAKEUP51](https://studyquests.github.io/category-makeup51.html)
- [BLOONS SURVIVALIO](https://studyplayings.pages.dev/bloons-survivalio.html)
- [PRIVACY](https://brainquests.vercel.app/privacy.html)
- [BATTLE OF TANK STEEL](https://studyquests.pages.dev/battle-of-tank-steel.html)
- [CATEGORY BLOCK91](https://studyplayings.web.app/category-block91.html)
- [CATEGORY CUTE62](https://studyplayings.web.app/category-cute62.html)
- [TAPKO](https://studyquesthub.web.app/tapko.html)
- [RAGDOLL PARKOUR SIMULATOR](https://learnquester.github.io/ragdoll-parkour-simulator.html)
- [DEAD PARADISE](https://quizverses.pages.dev/dead-paradise.html)
- [KNOCK AND RUN 100 DOORS ESCAPE](https://learnquesters.pages.dev/knock-and-run-100-doors-escape.html)
- [MINDBLOW](https://studyplaying.github.io/mindblow.html)
- [CATEGORY FLASH 2](https://studyquests.github.io/category-flash-2.html)
- [BURGER EMPIRE](https://studyquesthub.web.app/burger-empire.html)
- [NG FLOW LINES](https://studyquests.github.io/ng-flow-lines.html)
- [ZOMBCOPTER](https://studyplaying.github.io/zombcopter.html)
- [HEXA STACK](https://studyquests.github.io/hexa-stack.html)
- [FITNESS CLUB 3D](https://studyquests.github.io/fitness-club-3d.html)
- [PAWS OFF MY CLUES](https://studyquesthub.web.app/paws-off-my-clues.html)
- [CATEGORY MAHJONG 2](https://studyplayings.pages.dev/category-mahjong-2.html)
- [ROCKET FEST](https://studyplaying.github.io/rocket-fest.html)
