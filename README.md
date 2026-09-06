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
- [INDEX6](https://learnquesters.pages.dev/index6.html)
- [CATEGORY HORROR](https://studyquests.pages.dev/category-horror.html)
- [MURDER](https://learnquester.github.io/murder.html)
- [STELLAR FUSION](https://studyquests.pages.dev/stellar-fusion.html)
- [CATEGORY ART](https://studyplayings.web.app/category-art.html)
- [ADDICTION MINI SOLITAIRE](https://quizverses.github.io/addiction-mini-solitaire.html)
- [CATEGORY SIMULATION 3](https://studyquests.github.io/category-simulation-3.html)
- [FUN OBBY EXTREME](https://quizverses.github.io/fun-obby-extreme.html)
- [BANK ROBBERY ESCAPE](https://studyquests.pages.dev/bank-robbery-escape.html)
- [ARCADE ROPE](https://studyplaying.github.io/arcade-rope.html)
- [KIDS COLORING](https://quizverses.github.io/kids-coloring.html)
- [CATEGORY BIKE](https://thelearnquester.web.app/category-bike.html)
- [TANK SNIPER 3D](https://studyplayings.pages.dev/tank-sniper-3d.html)
- [INDEX26](https://quizverses.github.io/index26.html)
- [SAVAGE DEFENDERS](https://learnquester.github.io/savage-defenders.html)
- [ROOFTOP CHALLENGE](https://learnquester.github.io/rooftop-challenge.html)
- [BOLTS AND NUTS](https://quizverses.github.io/bolts-and-nuts.html)
- [LOGIC STORM ANIMALS PUZZLE](https://studyplaying.github.io/logic-storm-animals-puzzle.html)
- [GOO SLIME JUMP](https://quizverses.github.io/goo-slime-jump.html)
- [CATEGORY CASUAL](https://quizverses.github.io/category-casual.html)
- [CRAZYSTEVEIO](https://quizverses.github.io/crazysteveio.html)
- [FARM MATCH SEASONS 2](https://quizverses.github.io/farm-match-seasons-2.html)
- [BOYFRIEND FOR HIRE](https://quizverses.github.io/boyfriend-for-hire.html)
- [GUN EVOLUTION](https://quizverses.github.io/gun-evolution.html)
- [CHICKEN WARS MERGE GUNS](https://studyplaying.github.io/chicken-wars-merge-guns.html)
- [CATEGORY COLLECT565](https://quizverses.github.io/category-collect565.html)
- [CATEGORY MISSION207](https://thelearnquester.web.app/category-mission207.html)
- [CATEGORY MATCH 3117](https://iskillquest.pages.dev/category-match-3117.html)
- [CATEGORY CARDS](https://studyplaying.github.io/category-cards.html)
- [CATEGORY HORDE SURVIVAL67](https://quizverses.github.io/category-horde-survival67.html)
- [SUMMER MAZE](https://quizverses.github.io/summer-maze.html)
- [CATEGORY MAHJONG](https://studyplaying.github.io/category-mahjong.html)
- [FOOT CHINKO RUSSIA 2018](https://learnquester.github.io/foot-chinko-russia-2018.html)
- [GRUKKLE ONSLAUGHT](https://thelearnquesters.pages.dev/grukkle-onslaught.html)
- [WHEEL OF BINGO](https://learnquester.github.io/wheel-of-bingo.html)
- [GAS STATION STICK SIMULATOR](https://learnquester.github.io/gas-station-stick-simulator.html)
- [REAL CAR PARKING AND STUNT](https://learnquester.github.io/real-car-parking-and-stunt.html)
- [ZUMBLE STORY](https://quizverses.github.io/zumble-story.html)
- [PARADISE JOURNEY MATCH3](https://quizverses.github.io/paradise-journey-match3.html)
- [MERMAID PRINCESS AVATER CASTLE](https://learnquester.github.io/mermaid-princess-avater-castle.html)
- [FASHION WORLD SIMULATOR](https://studyquests.pages.dev/fashion-world-simulator.html)
- [CRAFT DRILL](https://learnquesters.pages.dev/craft-drill.html)
- [SQUID GAME MEMORY CARD MATCH](https://learnquesters.pages.dev/squid-game-memory-card-match.html)
- [CANNONS BLAST 3D](https://thelearnquesters.pages.dev/cannons-blast-3d.html)
- [BUBBLE IT JAM](https://studyquests.pages.dev/bubble-it-jam.html)
- [CATEGORY MOUSE1 699](https://quizverses.github.io/category-mouse1-699.html)
- [AGENTS IO](https://thelearnquesters.pages.dev/agents-io.html)
- [CATEGORY CONTROLLER 3](https://quizverses.github.io/category-controller-3.html)
- [INDEX29](https://studyplaying.github.io/index29.html)
- [CATEGORY DRAGON](https://studyplaying.github.io/category-dragon.html)
- [PET SALON](https://quizverses.github.io/pet-salon.html)
- [ULTIMATE FLYING CAR 2](https://learnquester.pages.dev/ultimate-flying-car-2.html)
- [ELLIE AND BEN CHRISTMAS EVE](https://learnquesters.pages.dev/ellie-and-ben-christmas-eve.html)
- [CAPYBARA SCREW JAM](https://thelearnquesters.pages.dev/capybara-screw-jam.html)
- [CATEGORY MANAGEMENT210](https://quizverses.github.io/category-management210.html)
- [CATEGORY MATCH 3](https://studyplayings.web.app/category-match-3.html)
- [CATEGORY COLOR197](https://quizverses.github.io/category-color197.html)
- [JAILBREAK ASSAULT](https://learnquester.github.io/jailbreak-assault.html)
- [CAR JAM ESCAPE](https://thelearnquesters.pages.dev/car-jam-escape.html)
- [WATERPARK SORT](https://thelearnquesters.pages.dev/waterpark-sort.html)
- [MEGA RAMP CAR](https://learnquester.pages.dev/mega-ramp-car.html)
- [IDLE LUNCH](https://studyquests.pages.dev/idle-lunch.html)
- [SNAKE PUZZLE ESCAPE](https://thequizzone.pages.dev/snake-puzzle-escape.html)
- [PIECE OF CAKE MERGE AND BAKE](https://thelearnquesters.pages.dev/piece-of-cake-merge-and-bake.html)
- [MERGE ARCHER DEFENSE](https://learnquester.pages.dev/merge-archer-defense.html)
- [HOME RUN BOY](https://learnquester.pages.dev/home-run-boy.html)
- [CANDY MATCH 4](https://thelearnquesters.pages.dev/candy-match-4.html)
- [BUILD YOUR AQUARIUM](https://learnquesters.pages.dev/build-your-aquarium.html)
- [CAT CHAOS SIMULATOR](https://thequizzone.pages.dev/cat-chaos-simulator.html)
- [STREET RACING MOTO DRIFT](https://thelearnquesters.pages.dev/street-racing-moto-drift.html)
- [RAGDOLL BOUNCE](https://quizverses.github.io/ragdoll-bounce.html)
- [INDEX19](https://studyplaying.github.io/index19.html)
- [LIGHT LINE](https://thequizzone.pages.dev/light-line.html)
- [CONTACT](https://quizverses.github.io/contact.html)
- [PARTY ANIMALS CATS EVOLUTION](https://thequizzone.pages.dev/party-animals-cats-evolution.html)
- [IDOL LIVESTREAM DOLL DRESS UP](https://learnquester.github.io/idol-livestream-doll-dress-up.html)
- [CATCH THE PIG](https://learnquester.pages.dev/catch-the-pig.html)
- [IMAGE CROSSWORD](https://thequizzone.pages.dev/image-crossword.html)
- [CATEGORY CAR](https://quizverses.github.io/category-car.html)
- [STICK NINJA SURVIVAL](https://thelearnquesters.pages.dev/stick-ninja-survival.html)
- [CATEGORY CONTROLLER59](https://quizverses.github.io/category-controller59.html)
- [GOOBER SHOT](https://learnquesters.pages.dev/goober-shot.html)
- [CATEGORY CAR](https://studyplayings.web.app/category-car.html)
- [ZOO RESTAURANT](https://thequizzone.pages.dev/zoo-restaurant.html)
- [HOME ISLAND](https://learnquester.github.io/home-island.html)
- [BLOSSOM](https://quizverses.github.io/blossom.html)
- [CATEGORY BATTLE](https://quizverses.github.io/category-battle.html)
- [AFRICAN PRINCESSES STYLE ISLAND](https://learnquester.pages.dev/african-princesses-style-island.html)
- [PYRAMIDZ](https://quizverses.github.io/pyramidz.html)
- [PING PONG AIR](https://quizverses.github.io/ping-pong-air.html)
- [ZOMBIE ARENA 2 FURY ROAD](https://thelearnquesters.pages.dev/zombie-arena-2-fury-road.html)
- [TRIANGLE WAY](https://learnquester.pages.dev/triangle-way.html)
- [BUBBLE SHOOTER BUTTERFLY](https://quizverses.github.io/bubble-shooter-butterfly.html)
- [TILE FARM STORY MATCHING GAME](https://quizverses.github.io/tile-farm-story-matching-game.html)
- [VIKINGS AN ARCHERS JOURNEY](https://thequizzone.pages.dev/vikings-an-archers-journey.html)
- [CURSED TREASURE 11 2](https://quizverses.github.io/cursed-treasure-11-2.html)
- [IDLE TRADE ROUTES](https://thelearnquesters.pages.dev/idle-trade-routes.html)
- [POPPING SUSHI](https://learnquesters.pages.dev/popping-sushi.html)
- [SORT PARKING](https://thequizzone.pages.dev/sort-parking.html)
- [HOME ISLAND](https://thelearnquesters.pages.dev/home-island.html)
- [MY ARCADE CENTER 2](https://thelearnquesters.pages.dev/my-arcade-center-2.html)
- [INDEX10](https://learnquester.github.io/index10.html)
- [CODEQUEST](https://thequizzone.pages.dev/codequest.html)
- [CS UPGRADE GUN](https://learnquesters.pages.dev/cs-upgrade-gun.html)
- [CATEGORY AGILITY 2](https://learnquesters.pages.dev/category-agility-2.html)
- [CATEGORY BRAIN261](https://thequizzone.pages.dev/category-brain261.html)
- [FASHION MAKEOVER DASH](https://quizverses.github.io/fashion-makeover-dash.html)
- [SPRUNKI CHALLENGE](https://learnquester.github.io/sprunki-challenge.html)
- [EMOJI MATCH](https://quizverses.github.io/emoji-match.html)
- [CATEGORY CASUAL 4](https://learnquesters.pages.dev/category-casual-4.html)
- [TRI PEAKS EMERLAND SOLITAIRE](https://learnquesters.pages.dev/tri-peaks-emerland-solitaire.html)
- [FASHION MAKEOVER DASH](https://studyplayings.pages.dev/fashion-makeover-dash.html)
- [KNIT BEARS](https://thequizzone.pages.dev/knit-bears.html)
- [HOMO EVOLUTION](https://learnquester.pages.dev/homo-evolution.html)
- [QUIZ X](https://quizverses.github.io/quiz-x.html)
- [ECO BLOCK PUZZLE](https://quizverses.github.io/eco-block-puzzle.html)
- [BRAIN PUZZLE TRICKY CHOICES](https://learnquester.github.io/brain-puzzle-tricky-choices.html)
- [COLORWARSIO CONQUEST GAME](https://thequizzone.pages.dev/colorwarsio-conquest-game.html)
- [EGG ADVENTURE MIRROR WORLD](https://learnquester.github.io/egg-adventure-mirror-world.html)
- [MEMORY WARS](https://quizverses.github.io/memory-wars.html)
- [ADVERSATOR](https://quizverses.github.io/adversator.html)
- [SLICE IT UP](https://learnquester.pages.dev/slice-it-up.html)
- [VIBE COLOURING](https://learnquester.pages.dev/vibe-colouring.html)
- [CATEGORY MAKEUP51](https://studyplaying.github.io/category-makeup51.html)
- [KITTY MATCH 3 PUZZLE GAME](https://learnquester.github.io/kitty-match-3-puzzle-game.html)
- [CATEGORY DEFENSE](https://thequizzone.pages.dev/category-defense.html)
- [HALLOWEEN STICKMAN](https://studyplaying.github.io/halloween-stickman.html)
- [CATEGORY 3D1 371](https://learnquesters.pages.dev/category-3d1-371.html)
- [CATEGORY SOLITAIRE27](https://studyplaying.github.io/category-solitaire27.html)
- [BUBBLE SHOOTER HAWAII](https://learnquesters.pages.dev/bubble-shooter-hawaii.html)
