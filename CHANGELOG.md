<a name="2.2.0"></a>
# [2.2.0](https://github.com/webpack/webpack/compare/v2.2.0-rc.8...v2.2.0) (2017-01-17)



<a name="2.2.0-rc.8"></a>
# [2.2.0-rc.8](https://github.com/webpack/webpack/compare/v2.2.0-rc.7...v2.2.0-rc.8) (2017-01-17)


### Bug Fixes

* **node:** rollback changes of Buffer.from to new Buffer() and bump down travis to 4.3 min node v ([91c1f35](https://github.com/webpack/webpack/commit/91c1f35))



<a name="2.2.0-rc.7"></a>
# [2.2.0-rc.7](https://github.com/webpack/webpack/compare/v2.2.0-rc.6...v2.2.0-rc.7) (2017-01-16)



<a name="2.2.0-rc.6"></a>
# [2.2.0-rc.6](https://github.com/webpack/webpack/compare/v2.2.0-rc.5...v2.2.0-rc.6) (2017-01-16)


### Bug Fixes

* **nmf:** Fix exports for var injection to include free glob exports or arguments ([5a3a23f](https://github.com/webpack/webpack/commit/5a3a23f))



<a name="2.2.0-rc.5"></a>
# [2.2.0-rc.5](https://github.com/webpack/webpack/compare/v2.2.0-rc.4...v2.2.0-rc.5) (2017-01-15)



<a name="2.2.0-rc.4"></a>
# [2.2.0-rc.4](https://github.com/webpack/webpack/compare/v2.2.0-rc.3...v2.2.0-rc.4) (2017-01-11)


### Bug Fixes

* **ProvidePlugin:** support properties from modules. Closes [#2864](https://github.com/webpack/webpack/issues/2864) ([#3597](https://github.com/webpack/webpack/issues/3597)) ([64f9a16](https://github.com/webpack/webpack/commit/64f9a16))
* **tests:** fix line endings which broke master ([#3827](https://github.com/webpack/webpack/issues/3827)) ([5f29ffc](https://github.com/webpack/webpack/commit/5f29ffc))
* **tests:** use less strict raw module time ([c70b3ed](https://github.com/webpack/webpack/commit/c70b3ed))


### Features

* **moduletemplate:** Wrap function module template wrappers with parens ([#3658](https://github.com/webpack/webpack/issues/3658)) ([c7b06ad](https://github.com/webpack/webpack/commit/c7b06ad))
* **performancebudgets:** set warnings in console off by default, however  should still display in stats ([#3604](https://github.com/webpack/webpack/issues/3604)) ([5f14559](https://github.com/webpack/webpack/commit/5f14559))
* **test:** add very simple binCases test infra to build off of ([b9128f8](https://github.com/webpack/webpack/commit/b9128f8))



<a name="2.2.0-rc.3"></a>
# [2.2.0-rc.3](https://github.com/webpack/webpack/compare/v2.2.0-rc.2...v2.2.0-rc.3) (2016-12-28)


### Bug Fixes

* **RuleSet:** allow array of functions returning either string or loader objects ([1c8c5b9](https://github.com/webpack/webpack/commit/1c8c5b9))
* **test:** Filter ES6 features from node v0.12. Fixes [#3552](https://github.com/webpack/webpack/issues/3552) ([199ac33](https://github.com/webpack/webpack/commit/199ac33))
* **tests:** add filter infra to ConfigTestCases ([2f8e3fc](https://github.com/webpack/webpack/commit/2f8e3fc))
* **warning:** only use keyword instanceof, fixes [#3562](https://github.com/webpack/webpack/issues/3562) ([#3566](https://github.com/webpack/webpack/issues/3566)) ([d751849](https://github.com/webpack/webpack/commit/d751849))


### Features

* **test:** increase coverage for target: 'webworker' ([#3204](https://github.com/webpack/webpack/issues/3204)) ([56924c6](https://github.com/webpack/webpack/commit/56924c6))



<a name="2.2.0-rc.2"></a>
# [2.2.0-rc.2](https://github.com/webpack/webpack/compare/v2.2.0-rc.1...v2.2.0-rc.2) (2016-12-22)


### Bug Fixes

* **require.ensure:** add ArrowFunctionExpression support: Fixes [#959](https://github.com/webpack/webpack/issues/959) ([a48a074](https://github.com/webpack/webpack/commit/a48a074))
* **stats:** allow stats to respect config for MultiCompiler, MultiStats ([a4106ea](https://github.com/webpack/webpack/commit/a4106ea))



<a name="2.2.0-rc.1"></a>
# [2.2.0-rc.1](https://github.com/webpack/webpack/compare/v2.2.0-rc.0...v2.2.0-rc.1) (2016-12-17)



<a name="2.2.0-rc.0"></a>
# [2.2.0-rc.0](https://github.com/webpack/webpack/compare/v2.1.0-beta.28...v2.2.0-rc.0) (2016-12-14)


### Bug Fixes

* **performance:** extract size function from out of entrypoint class ([5da9d8c](https://github.com/webpack/webpack/commit/5da9d8c))
* **performance:** remove unneeded test code ([3410d84](https://github.com/webpack/webpack/commit/3410d84))


### Features

* **performance:** don't include .map files in perf warnings ([541ec7c](https://github.com/webpack/webpack/commit/541ec7c))


* performance improvements ([da29d21](https://github.com/webpack/webpack/commit/da29d21))
* Refactoring, make options simpler ([37b7474](https://github.com/webpack/webpack/commit/37b7474))


### BREAKING CHANGES

* Module has now a "unbuild" method that must work correctly
* performance options changed



<a name="2.1.0-beta.28"></a>
# [2.1.0-beta.28](https://github.com/webpack/webpack/compare/v2.1.0-beta.27...v2.1.0-beta.28) (2016-12-13)


### Bug Fixes

* **beautify:** run npm beautify ([5747eff](https://github.com/webpack/webpack/commit/5747eff))
* **performance:** corrected tests, removed options access from stats, added mocks for web target check ([b2622e1](https://github.com/webpack/webpack/commit/b2622e1))
* **performance:** modified values to 250kb across the board for accurate reporting, modified string logic ([9894b58](https://github.com/webpack/webpack/commit/9894b58))
* **performance:** removed a consolelog ([00f9478](https://github.com/webpack/webpack/commit/00f9478))
* **performance:** removed hashes from expected.txt because hash changes beteween node v4 and v6/7 ([4eff4d7](https://github.com/webpack/webpack/commit/4eff4d7))
* **syntax:** fixed edge case where assets do not exist, and added schema ([0f0bdff](https://github.com/webpack/webpack/commit/0f0bdff))
* **test:** update test, fix asset type case, and formatting ([e360c8b](https://github.com/webpack/webpack/commit/e360c8b))
* **tests:** Updated tests across the board to work with perf budgets ([000dae1](https://github.com/webpack/webpack/commit/000dae1))


### Features

* **chunk:** added isAsync() function and additional NoAsyncChunks warning ([3fe1692](https://github.com/webpack/webpack/commit/3fe1692))
* **examples:** add example for context modules + code split via import() ([c35ca4e](https://github.com/webpack/webpack/commit/c35ca4e))
* **perf:** added initial setup for perf plugins, need to configure test cases and stats output based on perf props ([cbe2f06](https://github.com/webpack/webpack/commit/cbe2f06))
* **perf:** added initial setup for perf plugins, need to configure test cases and stats output based on perf props ([52bfdab](https://github.com/webpack/webpack/commit/52bfdab))
* **perfbudget:** creat initialAssetsCost with hardcoded limit ([2741098](https://github.com/webpack/webpack/commit/2741098))
* **perfbudgets:** Add separate classes for warnings, logic rewrite for plugin ([9e8c5f8](https://github.com/webpack/webpack/commit/9e8c5f8))
* **perfbudgets:** added errorOnHint flag defaulting to false for opt-in ([774a89b](https://github.com/webpack/webpack/commit/774a89b))
* **perfbudgets:** fixed issues with bad asset checking, and formatting ([e949aa1](https://github.com/webpack/webpack/commit/e949aa1))
* **performance:** removed logic out of stats and into plugin for assets over size limit ([0833c59](https://github.com/webpack/webpack/commit/0833c59))



<a name="2.1.0-beta.27"></a>
# [2.1.0-beta.27](https://github.com/webpack/webpack/compare/v2.1.0-beta.26...v2.1.0-beta.27) (2016-11-15)


### Bug Fixes

* **schema:** Remove `uniqueItems: true` from `noParse` ([29a08f0](https://github.com/webpack/webpack/commit/29a08f0)), closes [#3284](https://github.com/webpack/webpack/issues/3284)



<a name="2.1.0-beta.26"></a>
# [2.1.0-beta.26](https://github.com/webpack/webpack/compare/v2.1.0-beta.25...v2.1.0-beta.26) (2016-11-14)


### Bug Fixes

* **defaultAssign:** fix default argument assignment([#3252](https://github.com/webpack/webpack/issues/3252)) ([4eff597](https://github.com/webpack/webpack/commit/4eff597))
* **travis:** brute force install for INVALIDPEERs ([9aadbb4](https://github.com/webpack/webpack/commit/9aadbb4))
* **travis:** correct bash interpolation for unary statements ([2961bf7](https://github.com/webpack/webpack/commit/2961bf7))
* **travis:** fix full version of node v0.12 ([85f31b8](https://github.com/webpack/webpack/commit/85f31b8))
* **travis:** fix yarn link and yarn link webpack commands ([#3191](https://github.com/webpack/webpack/issues/3191)) ([a4ad44c](https://github.com/webpack/webpack/commit/a4ad44c))
* **travis:** force npm v3 minimum for older version of node ([ea75283](https://github.com/webpack/webpack/commit/ea75283))
* **travis:** looks like expression was still using yarn tests ([bad7359](https://github.com/webpack/webpack/commit/bad7359))
* **travis:** moved node 0.12 back to optional failing due to consts in tests ([e689a9d](https://github.com/webpack/webpack/commit/e689a9d))
* **travis:** require v0.12 as passing ([a7c51ca](https://github.com/webpack/webpack/commit/a7c51ca))
* **travis:** require v0.12 as passing ([481dff0](https://github.com/webpack/webpack/commit/481dff0))
* **travis:** run conditional install task (do not use yarn) when using node 0.12 ([7f4704c](https://github.com/webpack/webpack/commit/7f4704c))
* **travis:** run conditional install task (do not use yarn) when using node 0.12 ([f0679c7](https://github.com/webpack/webpack/commit/f0679c7))
* **travis:** try TRAVIS_NODE_VERSION ENV instead of creating variable ([dffa442](https://github.com/webpack/webpack/commit/dffa442))
* **travis:** use bash instead of sh ([cc8bd9a](https://github.com/webpack/webpack/commit/cc8bd9a))


### Features

* **readme:** add jsbeautify-loader to readme ([#3062](https://github.com/webpack/webpack/issues/3062)) ([e5ae047](https://github.com/webpack/webpack/commit/e5ae047))
* **ruleSet:** extend error context to resource and issuer ([f2c0e59](https://github.com/webpack/webpack/commit/f2c0e59))
* **ruleSet:** show context when exclude holds `undefined` ([6dd2863](https://github.com/webpack/webpack/commit/6dd2863))
* **travis:** cache directory for yarn and npm ([#3127](https://github.com/webpack/webpack/issues/3127)) ([09e5488](https://github.com/webpack/webpack/commit/09e5488))
* **travis:** reduce node runs ([#3129](https://github.com/webpack/webpack/issues/3129)) ([8c04df4](https://github.com/webpack/webpack/commit/8c04df4))



<a name="2.1.0-beta.25"></a>
# [2.1.0-beta.25](https://github.com/webpack/webpack/compare/v2.1.0-beta.24...v2.1.0-beta.25) (2016-09-21)



<a name="2.1.0-beta.24"></a>
# [2.1.0-beta.24](https://github.com/webpack/webpack/compare/v2.1.0-beta.23...v2.1.0-beta.24) (2016-09-20)


### Bug Fixes

* use anyOf in place of oneOf where intended ([1c136db](https://github.com/webpack/webpack/commit/1c136db))



<a name="2.1.0-beta.23"></a>
# [2.1.0-beta.23](https://github.com/webpack/webpack/compare/v2.1.0-beta.22...v2.1.0-beta.23) (2016-09-19)


### Bug Fixes

* add JSON schema for output.auxiliaryComment ([291fc3b](https://github.com/webpack/webpack/commit/291fc3b))
* add schemas to package.json files ([6b9c449](https://github.com/webpack/webpack/commit/6b9c449))
* devtool can have value false ([c83f869](https://github.com/webpack/webpack/commit/c83f869))
* do not console.log in the API ([bebc397](https://github.com/webpack/webpack/commit/bebc397))
* improve error phrasing ([9e0a95e](https://github.com/webpack/webpack/commit/9e0a95e))
* pass worker options using LoaderOptionsPlugin ([f523b17](https://github.com/webpack/webpack/commit/f523b17))
* remove unsupported property "optimize" ([9879466](https://github.com/webpack/webpack/commit/9879466))
* use LoaderOptionsPlugin to set updateIndex ([ccf9da2](https://github.com/webpack/webpack/commit/ccf9da2))


### Features

* add JSON schema for "name" property ([68460a0](https://github.com/webpack/webpack/commit/68460a0))
* add JSON schema for "stats" property ([be9c5ef](https://github.com/webpack/webpack/commit/be9c5ef))
* define validateWebpackOptions function ([7999745](https://github.com/webpack/webpack/commit/7999745))
* define WebpackOptionsValidationError ([91e3640](https://github.com/webpack/webpack/commit/91e3640))
* log validation errors to the console ([cee956d](https://github.com/webpack/webpack/commit/cee956d))
* throw error with validationErrors property ([992f5c8](https://github.com/webpack/webpack/commit/992f5c8))
* utilise WebpackOptionsValidationError ([4526824](https://github.com/webpack/webpack/commit/4526824))
* validate webpack options against a schema ([3ef4538](https://github.com/webpack/webpack/commit/3ef4538))


### refactoring

* moved parser instancation into NormalModuleFactory ([ec262a4](https://github.com/webpack/webpack/commit/ec262a4))


### BREAKING CHANGES

* compiler.parser must no longer be used. Use this instead:

``` js
compiler.plugin("compilation", function(compilation, params) {
  params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
    parser.plugin(/* ... */);
  });
});
```

required for #2978



<a name="2.1.0-beta.22"></a>
# [2.1.0-beta.22](https://github.com/webpack/webpack/compare/v2.1.0-beta.21...v2.1.0-beta.22) (2016-09-07)



<a name="2.1.0-beta.21"></a>
# [2.1.0-beta.21](https://github.com/webpack/webpack/compare/v2.1.0-beta.20...v2.1.0-beta.21) (2016-08-17)



<a name="2.1.0-beta.20"></a>
# [2.1.0-beta.20](https://github.com/webpack/webpack/compare/v2.1.0-beta.19...v2.1.0-beta.20) (2016-07-20)



<a name="2.1.0-beta.19"></a>
# [2.1.0-beta.19](https://github.com/webpack/webpack/compare/v2.1.0-beta.18...v2.1.0-beta.19) (2016-07-17)



<a name="2.1.0-beta.18"></a>
# [2.1.0-beta.18](https://github.com/webpack/webpack/compare/v2.1.0-beta.17...v2.1.0-beta.18) (2016-07-15)



<a name="2.1.0-beta.17"></a>
# [2.1.0-beta.17](https://github.com/webpack/webpack/compare/v2.1.0-beta.16...v2.1.0-beta.17) (2016-07-13)



<a name="2.1.0-beta.16"></a>
# [2.1.0-beta.16](https://github.com/webpack/webpack/compare/v2.1.0-beta.15...v2.1.0-beta.16) (2016-07-13)



<a name="2.1.0-beta.15"></a>
# [2.1.0-beta.15](https://github.com/webpack/webpack/compare/v2.1.0-beta.14...v2.1.0-beta.15) (2016-06-28)


### Bug Fixes

* fix typo in error message ([7a4dc0b](https://github.com/webpack/webpack/commit/7a4dc0b))



<a name="2.1.0-beta.14"></a>
# [2.1.0-beta.14](https://github.com/webpack/webpack/compare/v2.1.0-beta.13...v2.1.0-beta.14) (2016-06-24)



<a name="2.1.0-beta.13"></a>
# [2.1.0-beta.13](https://github.com/webpack/webpack/compare/v2.1.0-beta.12...v2.1.0-beta.13) (2016-06-07)



<a name="2.1.0-beta.12"></a>
# [2.1.0-beta.12](https://github.com/webpack/webpack/compare/v2.1.0-beta.11...v2.1.0-beta.12) (2016-06-05)



<a name="2.1.0-beta.11"></a>
# [2.1.0-beta.11](https://github.com/webpack/webpack/compare/v2.1.0-beta.10...v2.1.0-beta.11) (2016-06-05)



<a name="2.1.0-beta.10"></a>
# [2.1.0-beta.10](https://github.com/webpack/webpack/compare/v2.1.0-beta.9...v2.1.0-beta.10) (2016-06-05)



<a name="2.1.0-beta.9"></a>
# [2.1.0-beta.9](https://github.com/webpack/webpack/compare/v2.1.0-beta.8...v2.1.0-beta.9) (2016-06-04)



