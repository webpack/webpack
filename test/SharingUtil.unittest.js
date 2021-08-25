"use strict";

const { normalizeVersion } = require("../lib/sharing/utils");

describe("normalize dep version", () => {
	const commonInvalid = [
		"https://github.com#v1.0",
		"git://github.com#v1.0",
		"other:github.com/foo/bar#v1.0",
		"::",
		"",
		null,
		undefined
	];

	const commonValid = {
		"git+ssh://git@github.com:npm/cli.git#v1.0.27": "v1.0.27",
		"git+ssh://git@github.com:npm/cli#semver:^5.0": "^5.0",
		"git://github.com/npm/cli.git#v1.0.27": "v1.0.27",
		"git+https://isaacs@github.com/npm/cli.git": "",
		"v1.2": "v1.2",
		"^1.2.0": "^1.2.0",
		"git://localhost:12345/foo/bar#v1.0": "v1.0",
		"localhost:foo/bar#v1.0": "v1.0"
	};

	// TODO 增加 非 正常协议、非正常 domain  的case

	const githubInvalid = [
		// foo/bar shorthand but specifying auth
		"user@foo/bar#v1.0",
		"user:password@foo/bar#v1.0",
		":password@foo/bar#v1.0",
		// foo/bar shorthand but with a space in it
		"foo/ bar#v1.0",
		// string that ends with a slash, probably a directory
		"foo/bar/#v1.0",
		// git@github.com style, but omitting the username
		"github.com:foo/bar#v1.0",
		"github.com/foo/bar#v1.0",
		// invalid URI encoding
		"github:foo%0N/bar#v1.0",
		// missing path
		"git+ssh://git@github.com:#v1.0",
		// a deep url to something we don't know
		"https://github.com/foo/bar/issues#v1.0"
	];

	const githubValid = {
		// extreme shorthand (only for github)
		"foo/bar": "",
		"foo/bar#branch": "branch",
		"foo/bar#v1.0": "v1.0",
		"foo/bar.git": "",
		"foo/bar.git#v1.0": "v1.0",

		// shortcuts
		//
		// NOTE auth is accepted but ignored
		"github:foo/bar": "",
		"github:foo/bar#v1.0": "v1.0",
		"github:user@foo/bar": "",
		"github:user@foo/bar#v1.0": "v1.0",
		"github:user:password@foo/bar": "",
		"github:user:password@foo/bar#v1.0": "v1.0",
		"github::password@foo/bar": "",
		"github::password@foo/bar#v1.0": "v1.0",

		"github:foo/bar.git": "",
		"github:foo/bar.git#v1.0": "v1.0",
		"github:user@foo/bar.git": "",
		"github:user@foo/bar.git#v1.0": "v1.0",
		"github:user:password@foo/bar.git": "",
		"github:user:password@foo/bar.git#v1.0": "v1.0",
		"github::password@foo/bar.git": "",
		"github::password@foo/bar.git#v1.0": "v1.0",

		// NOTE auth is accepted and respected
		"git://github.com/foo/bar": "",
		"git://github.com/foo/bar#v1.0": "v1.0",
		"git://user@github.com/foo/bar": "",
		"git://user@github.com/foo/bar#v1.0": "v1.0",
		"git://user:password@github.com/foo/bar": "",
		"git://user:password@github.com/foo/bar#v1.0": "v1.0",
		"git://:password@github.com/foo/bar": "",
		"git://:password@github.com/foo/bar#v1.0": "v1.0",

		"git://github.com/foo/bar.git": "",
		"git://github.com/foo/bar.git#v1.0": "v1.0",
		"git://git@github.com/foo/bar.git": "",
		"git://git@github.com/foo/bar.git#v1.0": "v1.0",
		"git://user:password@github.com/foo/bar.git": "",
		"git://user:password@github.com/foo/bar.git#v1.0": "v1.0",
		"git://:password@github.com/foo/bar.git": "",
		"git://:password@github.com/foo/bar.git#v1.0": "v1.0",

		// no-protocol git+ssh
		//
		// NOTE auth is _required_ (see invalid list) but ignored
		"user@github.com:foo/bar": "",
		"user@github.com:foo/bar#v1.0": "v1.0",
		"user:password@github.com:foo/bar": "",
		"user:password@github.com:foo/bar#v1.0": "v1.0",
		":password@github.com:foo/bar": "",
		":password@github.com:foo/bar#v1.0": "v1.0",

		"user@github.com:foo/bar.git": "",
		"user@github.com:foo/bar.git#v1.0": "v1.0",
		"user:password@github.com:foo/bar.git": "",
		"user:password@github.com:foo/bar.git#v1.0": "v1.0",
		":password@github.com:foo/bar.git": "",
		":password@github.com:foo/bar.git#v1.0": "v1.0",

		// git+ssh urls
		//
		// NOTE auth is accepted but ignored
		"git+ssh://github.com:foo/bar": "",
		"git+ssh://github.com:foo/bar#v1.0": "v1.0",
		"git+ssh://user@github.com:foo/bar": "",
		"git+ssh://user@github.com:foo/bar#v1.0": "v1.0",
		"git+ssh://user:password@github.com:foo/bar": "",
		"git+ssh://user:password@github.com:foo/bar#v1.0": "v1.0",
		"git+ssh://:password@github.com:foo/bar": "",
		"git+ssh://:password@github.com:foo/bar#v1.0": "v1.0",

		"git+ssh://github.com:foo/bar.git": "",
		"git+ssh://github.com:foo/bar.git#v1.0": "v1.0",
		"git+ssh://user@github.com:foo/bar.git": "",
		"git+ssh://user@github.com:foo/bar.git#v1.0": "v1.0",
		"git+ssh://user:password@github.com:foo/bar.git": "",
		"git+ssh://user:password@github.com:foo/bar.git#v1.0": "v1.0",
		"git+ssh://:password@github.com:foo/bar.git": "",
		"git+ssh://:password@github.com:foo/bar.git#v1.0": "v1.0",

		// ssh urls
		//
		// NOTE auth is accepted but ignored
		"ssh://github.com:foo/bar": "",
		"ssh://github.com:foo/bar#v1.0": "v1.0",
		"ssh://user@github.com:foo/bar": "",
		"ssh://user@github.com:foo/bar#v1.0": "v1.0",
		"ssh://user:password@github.com:foo/bar": "",
		"ssh://user:password@github.com:foo/bar#v1.0": "v1.0",
		"ssh://:password@github.com:foo/bar": "",
		"ssh://:password@github.com:foo/bar#v1.0": "v1.0",

		"ssh://github.com:foo/bar.git": "",
		"ssh://github.com:foo/bar.git#v1.0": "v1.0",
		"ssh://user@github.com:foo/bar.git": "",
		"ssh://user@github.com:foo/bar.git#v1.0": "v1.0",
		"ssh://user:password@github.com:foo/bar.git": "",
		"ssh://user:password@github.com:foo/bar.git#v1.0": "v1.0",
		"ssh://:password@github.com:foo/bar.git": "",
		"ssh://:password@github.com:foo/bar.git#v1.0": "v1.0",

		// git+https urls
		//
		// NOTE auth is accepted and respected
		"git+https://github.com/foo/bar": "",
		"git+https://github.com/foo/bar#v1.0": "v1.0",
		"git+https://user@github.com/foo/bar": "",
		"git+https://user@github.com/foo/bar#v1.0": "v1.0",
		"git+https://user:password@github.com/foo/bar": "",
		"git+https://user:password@github.com/foo/bar#v1.0": "v1.0",
		"git+https://:password@github.com/foo/bar": "",
		"git+https://:password@github.com/foo/bar#v1.0": "v1.0",

		"git+https://github.com/foo/bar.git": "",
		"git+https://github.com/foo/bar.git#v1.0": "v1.0",
		"git+https://user@github.com/foo/bar.git": "",
		"git+https://user@github.com/foo/bar.git#v1.0": "v1.0",
		"git+https://user:password@github.com/foo/bar.git": "",
		"git+https://user:password@github.com/foo/bar.git#v1.0": "v1.0",
		"git+https://:password@github.com/foo/bar.git": "",
		"git+https://:password@github.com/foo/bar.git#v1.0": "v1.0",

		// https urls
		//
		// NOTE auth is accepted and respected
		"https://github.com/foo/bar": "",
		"https://github.com/foo/bar#v1.0": "v1.0",
		"https://user@github.com/foo/bar": "",
		"https://user@github.com/foo/bar#v1.0": "v1.0",
		"https://user:password@github.com/foo/bar": "",
		"https://user:password@github.com/foo/bar#v1.0": "v1.0",
		"https://:password@github.com/foo/bar": "",
		"https://:password@github.com/foo/bar#v1.0": "v1.0",

		"https://github.com/foo/bar.git": "",
		"https://github.com/foo/bar.git#v1.0": "v1.0",
		"https://user@github.com/foo/bar.git": "",
		"https://user@github.com/foo/bar.git#v1.0": "v1.0",
		"https://user:password@github.com/foo/bar.git": "",
		"https://user:password@github.com/foo/bar.git#v1.0": "v1.0",
		"https://:password@github.com/foo/bar.git": "",
		"https://:password@github.com/foo/bar.git#v1.0": "v1.0",

		// inputs that are not quite proper but we accept anyway
		"https://www.github.com/foo/bar": "",
		// xxx by liulangyu 这是否合理？ 有没有 case 验证
		"foo/bar#branch with space": "branch with space",
		"https://github.com/foo/bar/tree/branch": "branch",
		"user..blerg--/..foo-js# . . . . . some . tags / / /":
			" . . . . . some . tags / / /"
	};

	const gitlabInvalid = [
		// gitlab urls can contain a /-/ segment, make sure we ignore those
		"https://gitlab.com/foo/-/something",
		// missing project
		"https://gitlab.com/foo",
		// tarball, this should not parse so that it can be used for pacote's remote fetcher
		"https://gitlab.com/foo/bar/repository/archive.tar.gz",
		"https://gitlab.com/foo/bar/repository/archive.tar.gz?ref=49b393e2ded775f2df36ef2ffcb61b0359c194c9"
	];

	const gitlabValid = {
		// shortcuts
		//
		// NOTE auth is accepted but ignored
		// NOTE subgroups are respected, but the subgroup is treated as the project and the real project is lost
		"gitlab:foo/bar": "",
		"gitlab:foo/bar#v1.0": "v1.0",
		"gitlab:user@foo/bar": "",
		"gitlab:user@foo/bar#v1.0": "v1.0",
		"gitlab:user:password@foo/bar": "",
		"gitlab:user:password@foo/bar#v1.0": "v1.0",
		"gitlab::password@foo/bar": "",
		"gitlab::password@foo/bar#v1.0": "v1.0",

		"gitlab:foo/bar.git": "",
		"gitlab:foo/bar.git#v1.0": "v1.0",
		"gitlab:user@foo/bar.git": "",
		"gitlab:user@foo/bar.git#v1.0": "v1.0",
		"gitlab:user:password@foo/bar.git": "",
		"gitlab:user:password@foo/bar.git#v1.0": "v1.0",
		"gitlab::password@foo/bar.git": "",
		"gitlab::password@foo/bar.git#v1.0": "v1.0",

		"gitlab:foo/bar/baz": "",
		"gitlab:foo/bar/baz#v1.0": "v1.0",
		"gitlab:user@foo/bar/baz": "",
		"gitlab:user@foo/bar/baz#v1.0": "v1.0",
		"gitlab:user:password@foo/bar/baz": "",
		"gitlab:user:password@foo/bar/baz#v1.0": "v1.0",
		"gitlab::password@foo/bar/baz": "",
		"gitlab::password@foo/bar/baz#v1.0": "v1.0",

		"gitlab:foo/bar/baz.git": "",
		"gitlab:foo/bar/baz.git#v1.0": "v1.0",
		"gitlab:user@foo/bar/baz.git": "",
		"gitlab:user@foo/bar/baz.git#v1.0": "v1.0",
		"gitlab:user:password@foo/bar/baz.git": "",
		"gitlab:user:password@foo/bar/baz.git#v1.0": "v1.0",
		"gitlab::password@foo/bar/baz.git": "",
		"gitlab::password@foo/bar/baz.git#v1.0": "v1.0",

		// no-protocol git+ssh
		//
		// NOTE auth is _required_ (see invalid list) but ignored
		"user@gitlab.com:foo/bar": "",
		"user@gitlab.com:foo/bar#v1.0": "v1.0",
		"user:password@gitlab.com:foo/bar": "",
		"user:password@gitlab.com:foo/bar#v1.0": "v1.0",
		":password@gitlab.com:foo/bar": "",
		":password@gitlab.com:foo/bar#v1.0": "v1.0",

		"user@gitlab.com:foo/bar.git": "",
		"user@gitlab.com:foo/bar.git#v1.0": "v1.0",
		"user:password@gitlab.com:foo/bar.git": "",
		"user:password@gitlab.com:foo/bar.git#v1.0": "v1.0",
		":password@gitlab.com:foo/bar.git": "",
		":password@gitlab.com:foo/bar.git#v1.0": "v1.0",

		"user@gitlab.com:foo/bar/baz": "",
		"user@gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"user:password@gitlab.com:foo/bar/baz": "",
		"user:password@gitlab.com:foo/bar/baz#v1.0": "v1.0",
		":password@gitlab.com:foo/bar/baz": "",
		":password@gitlab.com:foo/bar/baz#v1.0": "v1.0",

		"user@gitlab.com:foo/bar/baz.git": "",
		"user@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"user:password@gitlab.com:foo/bar/baz.git": "",
		"user:password@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		":password@gitlab.com:foo/bar/baz.git": "",
		":password@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",

		// git+ssh urls
		//
		// NOTE auth is accepted but ignored
		// NOTE subprojects are accepted, but the subproject is treated as the project and the real project is lost
		"git+ssh://gitlab.com:foo/bar": "",
		"git+ssh://gitlab.com:foo/bar#v1.0": "v1.0",
		"git+ssh://user@gitlab.com:foo/bar": "",
		"git+ssh://user@gitlab.com:foo/bar#v1.0": "v1.0",
		"git+ssh://user:password@gitlab.com:foo/bar": "",
		"git+ssh://user:password@gitlab.com:foo/bar#v1.0": "v1.0",
		"git+ssh://:password@gitlab.com:foo/bar": "",
		"git+ssh://:password@gitlab.com:foo/bar#v1.0": "v1.0",

		"git+ssh://gitlab.com:foo/bar.git": "",
		"git+ssh://gitlab.com:foo/bar.git#v1.0": "v1.0",
		"git+ssh://user@gitlab.com:foo/bar.git": "",
		"git+ssh://user@gitlab.com:foo/bar.git#v1.0": "v1.0",
		"git+ssh://user:password@gitlab.com:foo/bar.git": "",
		"git+ssh://user:password@gitlab.com:foo/bar.git#v1.0": "v1.0",
		"git+ssh://:password@gitlab.com:foo/bar.git": "",
		"git+ssh://:password@gitlab.com:foo/bar.git#v1.0": "v1.0",

		"git+ssh://gitlab.com:foo/bar/baz": "",
		"git+ssh://gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"git+ssh://user@gitlab.com:foo/bar/baz": "",
		"git+ssh://user@gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"git+ssh://user:password@gitlab.com:foo/bar/baz": "",
		"git+ssh://user:password@gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"git+ssh://:password@gitlab.com:foo/bar/baz": "",
		"git+ssh://:password@gitlab.com:foo/bar/baz#v1.0": "v1.0",

		"git+ssh://gitlab.com:foo/bar/baz.git": "",
		"git+ssh://gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"git+ssh://user@gitlab.com:foo/bar/baz.git": "",
		"git+ssh://user@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"git+ssh://user:password@gitlab.com:foo/bar/baz.git": "",
		"git+ssh://user:password@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"git+ssh://:password@gitlab.com:foo/bar/baz.git": "",
		"git+ssh://:password@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",

		// ssh urls
		//
		// NOTE auth is accepted but ignored
		// NOTE subprojects are accepted, but the subproject is treated as the project and the real project is lost
		"ssh://gitlab.com:foo/bar": "",
		"ssh://gitlab.com:foo/bar#v1.0": "v1.0",
		"ssh://user@gitlab.com:foo/bar": "",
		"ssh://user@gitlab.com:foo/bar#v1.0": "v1.0",
		"ssh://user:password@gitlab.com:foo/bar": "",
		"ssh://user:password@gitlab.com:foo/bar#v1.0": "v1.0",
		"ssh://:password@gitlab.com:foo/bar": "",
		"ssh://:password@gitlab.com:foo/bar#v1.0": "v1.0",

		"ssh://gitlab.com:foo/bar.git": "",
		"ssh://gitlab.com:foo/bar.git#v1.0": "v1.0",
		"ssh://user@gitlab.com:foo/bar.git": "",
		"ssh://user@gitlab.com:foo/bar.git#v1.0": "v1.0",
		"ssh://user:password@gitlab.com:foo/bar.git": "",
		"ssh://user:password@gitlab.com:foo/bar.git#v1.0": "v1.0",
		"ssh://:password@gitlab.com:foo/bar.git": "",
		"ssh://:password@gitlab.com:foo/bar.git#v1.0": "v1.0",

		"ssh://gitlab.com:foo/bar/baz": "",
		"ssh://gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"ssh://user@gitlab.com:foo/bar/baz": "",
		"ssh://user@gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"ssh://user:password@gitlab.com:foo/bar/baz": "",
		"ssh://user:password@gitlab.com:foo/bar/baz#v1.0": "v1.0",
		"ssh://:password@gitlab.com:foo/bar/baz": "",
		"ssh://:password@gitlab.com:foo/bar/baz#v1.0": "v1.0",

		"ssh://gitlab.com:foo/bar/baz.git": "",
		"ssh://gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"ssh://user@gitlab.com:foo/bar/baz.git": "",
		"ssh://user@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"ssh://user:password@gitlab.com:foo/bar/baz.git": "",
		"ssh://user:password@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",
		"ssh://:password@gitlab.com:foo/bar/baz.git": "",
		"ssh://:password@gitlab.com:foo/bar/baz.git#v1.0": "v1.0",

		// git+https urls
		//
		// NOTE auth is accepted and respected
		// NOTE subprojects are accepted, but the subproject is treated as the project and the real project is lost
		"git+https://gitlab.com/foo/bar": "",
		"git+https://gitlab.com/foo/bar#v1.0": "v1.0",
		"git+https://user@gitlab.com/foo/bar": "",
		"git+https://user@gitlab.com/foo/bar#v1.0": "v1.0",
		"git+https://user:password@gitlab.com/foo/bar": "",
		"git+https://user:password@gitlab.com/foo/bar#v1.0": "v1.0",
		"git+https://:password@gitlab.com/foo/bar": "",
		"git+https://:password@gitlab.com/foo/bar#v1.0": "v1.0",

		"git+https://gitlab.com/foo/bar.git": "",
		"git+https://gitlab.com/foo/bar.git#v1.0": "v1.0",
		"git+https://user@gitlab.com/foo/bar.git": "",
		"git+https://user@gitlab.com/foo/bar.git#v1.0": "v1.0",
		"git+https://user:password@gitlab.com/foo/bar.git": "",
		"git+https://user:password@gitlab.com/foo/bar.git#v1.0": "v1.0",
		"git+https://:password@gitlab.com/foo/bar.git": "",
		"git+https://:password@gitlab.com/foo/bar.git#v1.0": "v1.0",

		"git+https://gitlab.com/foo/bar/baz": "",
		"git+https://gitlab.com/foo/bar/baz#v1.0": "v1.0",
		"git+https://user@gitlab.com/foo/bar/baz": "",
		"git+https://user@gitlab.com/foo/bar/baz#v1.0": "v1.0",
		"git+https://user:password@gitlab.com/foo/bar/baz": "",
		"git+https://user:password@gitlab.com/foo/bar/baz#v1.0": "v1.0",
		"git+https://:password@gitlab.com/foo/bar/baz": "",
		"git+https://:password@gitlab.com/foo/bar/baz#v1.0": "v1.0",

		"git+https://gitlab.com/foo/bar/baz.git": "",
		"git+https://gitlab.com/foo/bar/baz.git#v1.0": "v1.0",
		"git+https://user@gitlab.com/foo/bar/baz.git": "",
		"git+https://user@gitlab.com/foo/bar/baz.git#v1.0": "v1.0",
		"git+https://user:password@gitlab.com/foo/bar/baz.git": "",
		"git+https://user:password@gitlab.com/foo/bar/baz.git#v1.0": "v1.0",
		"git+https://:password@gitlab.com/foo/bar/baz.git": "",
		"git+https://:password@gitlab.com/foo/bar/baz.git#v1.0": "v1.0",

		// https urls
		//
		// NOTE auth is accepted and respected
		// NOTE subprojects are accepted, but the subproject is treated as the project and the real project is lost
		"https://gitlab.com/foo/bar": "",
		"https://gitlab.com/foo/bar#v1.0": "v1.0",
		"https://user@gitlab.com/foo/bar": "",
		"https://user@gitlab.com/foo/bar#v1.0": "v1.0",
		"https://user:password@gitlab.com/foo/bar": "",
		"https://user:password@gitlab.com/foo/bar#v1.0": "v1.0",
		"https://:password@gitlab.com/foo/bar": "",
		"https://:password@gitlab.com/foo/bar#v1.0": "v1.0",

		"https://gitlab.com/foo/bar.git": "",
		"https://gitlab.com/foo/bar.git#v1.0": "v1.0",
		"https://user@gitlab.com/foo/bar.git": "",
		"https://user@gitlab.com/foo/bar.git#v1.0": "v1.0",
		"https://user:password@gitlab.com/foo/bar.git": "",
		"https://user:password@gitlab.com/foo/bar.git#v1.0": "v1.0",
		"https://:password@gitlab.com/foo/bar.git": "",
		"https://:password@gitlab.com/foo/bar.git#v1.0": "v1.0",

		"https://gitlab.com/foo/bar/baz": "",
		"https://gitlab.com/foo/bar/baz#v1.0": "v1.0",
		"https://user@gitlab.com/foo/bar/baz": "",
		"https://user@gitlab.com/foo/bar/baz#v1.0": "v1.0",
		"https://user:password@gitlab.com/foo/bar/baz": "",
		"https://user:password@gitlab.com/foo/bar/baz#v1.0": "v1.0",
		"https://:password@gitlab.com/foo/bar/baz": "",
		"https://:password@gitlab.com/foo/bar/baz#v1.0": "v1.0",

		"https://gitlab.com/foo/bar/baz.git": "",
		"https://gitlab.com/foo/bar/baz.git#v1.0": "v1.0",
		"https://user@gitlab.com/foo/bar/baz.git": "",
		"https://user@gitlab.com/foo/bar/baz.git#v1.0": "v1.0",
		"https://user:password@gitlab.com/foo/bar/baz.git": "",
		"https://user:password@gitlab.com/foo/bar/baz.git#v1.0": "v1.0",
		"https://:password@gitlab.com/foo/bar/baz.git": "",
		"https://:password@gitlab.com/foo/bar/baz.git#v1.0": "v1.0"
	};

	const bitbucketInvalid = [
		// invalid protocol
		"git://bitbucket.org/foo/bar",
		// url to get a tarball
		"https://bitbucket.org/foo/bar/get/archive.tar.gz",
		// missing project
		"https://bitbucket.org/foo"
	];

	const bitbucketValid = {
		// shortucts
		//
		// NOTE auth is accepted but ignored
		"bitbucket:foo/bar": "",
		"bitbucket:foo/bar#v1.0": "v1.0",
		"bitbucket:user@foo/bar": "",
		"bitbucket:user@foo/bar#v1.0": "v1.0",
		"bitbucket:user:password@foo/bar": "",
		"bitbucket:user:password@foo/bar#v1.0": "v1.0",
		"bitbucket::password@foo/bar": "",
		"bitbucket::password@foo/bar#v1.0": "v1.0",

		"bitbucket:foo/bar.git": "",
		"bitbucket:foo/bar.git#v1.0": "v1.0",
		"bitbucket:user@foo/bar.git": "",
		"bitbucket:user@foo/bar.git#v1.0": "v1.0",
		"bitbucket:user:password@foo/bar.git": "",
		"bitbucket:user:password@foo/bar.git#v1.0": "v1.0",
		"bitbucket::password@foo/bar.git": "",
		"bitbucket::password@foo/bar.git#v1.0": "v1.0",

		// no-protocol git+ssh
		//
		// NOTE auth is accepted but ignored
		"git@bitbucket.org:foo/bar": "",
		"git@bitbucket.org:foo/bar#v1.0": "v1.0",
		"user@bitbucket.org:foo/bar": "",
		"user@bitbucket.org:foo/bar#v1.0": "v1.0",
		"user:password@bitbucket.org:foo/bar": "",
		"user:password@bitbucket.org:foo/bar#v1.0": "v1.0",
		":password@bitbucket.org:foo/bar": "",
		":password@bitbucket.org:foo/bar#v1.0": "v1.0",

		"git@bitbucket.org:foo/bar.git": "",
		"git@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"user@bitbucket.org:foo/bar.git": "",
		"user@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"user:password@bitbucket.org:foo/bar.git": "",
		"user:password@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		":password@bitbucket.org:foo/bar.git": "",
		":password@bitbucket.org:foo/bar.git#v1.0": "v1.0",

		// git+ssh urls
		//
		// NOTE auth is accepted but ignored
		"git+ssh://bitbucket.org:foo/bar": "",
		"git+ssh://bitbucket.org:foo/bar#v1.0": "v1.0",
		"git+ssh://user@bitbucket.org:foo/bar": "",
		"git+ssh://user@bitbucket.org:foo/bar#v1.0": "v1.0",
		"git+ssh://user:password@bitbucket.org:foo/bar": "",
		"git+ssh://user:password@bitbucket.org:foo/bar#v1.0": "v1.0",
		"git+ssh://:password@bitbucket.org:foo/bar": "",
		"git+ssh://:password@bitbucket.org:foo/bar#v1.0": "v1.0",

		"git+ssh://bitbucket.org:foo/bar.git": "",
		"git+ssh://bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"git+ssh://user@bitbucket.org:foo/bar.git": "",
		"git+ssh://user@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"git+ssh://user:password@bitbucket.org:foo/bar.git": "",
		"git+ssh://user:password@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"git+ssh://:password@bitbucket.org:foo/bar.git": "",
		"git+ssh://:password@bitbucket.org:foo/bar.git#v1.0": "v1.0",

		// ssh urls
		//
		// NOTE auth is accepted but ignored
		"ssh://bitbucket.org:foo/bar": "",
		"ssh://bitbucket.org:foo/bar#v1.0": "v1.0",
		"ssh://user@bitbucket.org:foo/bar": "",
		"ssh://user@bitbucket.org:foo/bar#v1.0": "v1.0",
		"ssh://user:password@bitbucket.org:foo/bar": "",
		"ssh://user:password@bitbucket.org:foo/bar#v1.0": "v1.0",
		"ssh://:password@bitbucket.org:foo/bar": "",
		"ssh://:password@bitbucket.org:foo/bar#v1.0": "v1.0",

		"ssh://bitbucket.org:foo/bar.git": "",
		"ssh://bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"ssh://user@bitbucket.org:foo/bar.git": "",
		"ssh://user@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"ssh://user:password@bitbucket.org:foo/bar.git": "",
		"ssh://user:password@bitbucket.org:foo/bar.git#v1.0": "v1.0",
		"ssh://:password@bitbucket.org:foo/bar.git": "",
		"ssh://:password@bitbucket.org:foo/bar.git#v1.0": "v1.0",

		// git+https urls
		//
		// NOTE auth is accepted and respected
		"git+https://bitbucket.org/foo/bar": "",
		"git+https://bitbucket.org/foo/bar#v1.0": "v1.0",
		"git+https://user@bitbucket.org/foo/bar": "",
		"git+https://user@bitbucket.org/foo/bar#v1.0": "v1.0",
		"git+https://user:password@bitbucket.org/foo/bar": "",
		"git+https://user:password@bitbucket.org/foo/bar#v1.0": "v1.0",
		"git+https://:password@bitbucket.org/foo/bar": "",
		"git+https://:password@bitbucket.org/foo/bar#v1.0": "v1.0",

		"git+https://bitbucket.org/foo/bar.git": "",
		"git+https://bitbucket.org/foo/bar.git#v1.0": "v1.0",
		"git+https://user@bitbucket.org/foo/bar.git": "",
		"git+https://user@bitbucket.org/foo/bar.git#v1.0": "v1.0",
		"git+https://user:password@bitbucket.org/foo/bar.git": "",
		"git+https://user:password@bitbucket.org/foo/bar.git#v1.0": "v1.0",
		"git+https://:password@bitbucket.org/foo/bar.git": "",
		"git+https://:password@bitbucket.org/foo/bar.git#v1.0": "v1.0",

		// https urls
		//
		// NOTE auth is accepted and respected
		"https://bitbucket.org/foo/bar": "",
		"https://bitbucket.org/foo/bar#v1.0": "v1.0",
		"https://user@bitbucket.org/foo/bar": "",
		"https://user@bitbucket.org/foo/bar#v1.0": "v1.0",
		"https://user:password@bitbucket.org/foo/bar": "",
		"https://user:password@bitbucket.org/foo/bar#v1.0": "v1.0",
		"https://:password@bitbucket.org/foo/bar": "",
		"https://:password@bitbucket.org/foo/bar#v1.0": "v1.0",

		"https://bitbucket.org/foo/bar.git": "",
		"https://bitbucket.org/foo/bar.git#v1.0": "v1.0",
		"https://user@bitbucket.org/foo/bar.git": "",
		"https://user@bitbucket.org/foo/bar.git#v1.0": "v1.0",
		"https://user:password@bitbucket.org/foo/bar.git": "",
		"https://user:password@bitbucket.org/foo/bar.git#v1.0": "v1.0",
		"https://:password@bitbucket.org/foo/bar.git": "",
		"https://:password@bitbucket.org/foo/bar.git#v1.0": "v1.0"
	};

	const gistInvalid = [
		// raw urls that are wrong anyway but for some reason are in the wild
		"https://gist.github.com/foo/feedbeef/raw/fix%2Fbug/",
		// missing both user and project
		"https://gist.github.com/"
	];

	const gistValid = {
		// shortcuts
		//
		// NOTE auth is accepted but ignored
		"gist:feedbeef": "",
		"gist:feedbeef#v1.0": "v1.0",
		"gist:user@feedbeef": "",
		"gist:user@feedbeef#v1.0": "v1.0",
		"gist:user:password@feedbeef": "",
		"gist:user:password@feedbeef#v1.0": "v1.0",
		"gist::password@feedbeef": "",
		"gist::password@feedbeef#v1.0": "v1.0",

		"gist:feedbeef.git": "",
		"gist:feedbeef.git#v1.0": "v1.0",
		"gist:user@feedbeef.git": "",
		"gist:user@feedbeef.git#v1.0": "v1.0",
		"gist:user:password@feedbeef.git": "",
		"gist:user:password@feedbeef.git#v1.0": "v1.0",
		"gist::password@feedbeef.git": "",
		"gist::password@feedbeef.git#v1.0": "v1.0",

		"gist:/feedbeef": "",
		"gist:/feedbeef#v1.0": "v1.0",
		"gist:user@/feedbeef": "",
		"gist:user@/feedbeef#v1.0": "v1.0",
		"gist:user:password@/feedbeef": "",
		"gist:user:password@/feedbeef#v1.0": "v1.0",
		"gist::password@/feedbeef": "",
		"gist::password@/feedbeef#v1.0": "v1.0",

		"gist:/feedbeef.git": "",
		"gist:/feedbeef.git#v1.0": "v1.0",
		"gist:user@/feedbeef.git": "",
		"gist:user@/feedbeef.git#v1.0": "v1.0",
		"gist:user:password@/feedbeef.git": "",
		"gist:user:password@/feedbeef.git#v1.0": "v1.0",
		"gist::password@/feedbeef.git": "",
		"gist::password@/feedbeef.git#v1.0": "v1.0",

		"gist:foo/feedbeef": "",
		"gist:foo/feedbeef#v1.0": "v1.0",
		"gist:user@foo/feedbeef": "",
		"gist:user@foo/feedbeef#v1.0": "v1.0",
		"gist:user:password@foo/feedbeef": "",
		"gist:user:password@foo/feedbeef#v1.0": "v1.0",
		"gist::password@foo/feedbeef": "",
		"gist::password@foo/feedbeef#v1.0": "v1.0",

		"gist:foo/feedbeef.git": "",
		"gist:foo/feedbeef.git#v1.0": "v1.0",
		"gist:user@foo/feedbeef.git": "",
		"gist:user@foo/feedbeef.git#v1.0": "v1.0",
		"gist:user:password@foo/feedbeef.git": "",
		"gist:user:password@foo/feedbeef.git#v1.0": "v1.0",
		"gist::password@foo/feedbeef.git": "",
		"gist::password@foo/feedbeef.git#v1.0": "v1.0",

		// git urls
		//
		// NOTE auth is accepted and respected
		"git://gist.github.com/feedbeef": "",
		"git://gist.github.com/feedbeef#v1.0": "v1.0",
		"git://user@gist.github.com/feedbeef": "",
		"git://user@gist.github.com/feedbeef#v1.0": "v1.0",
		"git://user:password@gist.github.com/feedbeef": "",
		"git://user:password@gist.github.com/feedbeef#v1.0": "v1.0",
		"git://:password@gist.github.com/feedbeef": "",
		"git://:password@gist.github.com/feedbeef#v1.0": "v1.0",

		"git://gist.github.com/feedbeef.git": "",
		"git://gist.github.com/feedbeef.git#v1.0": "v1.0",
		"git://user@gist.github.com/feedbeef.git": "",
		"git://user@gist.github.com/feedbeef.git#v1.0": "v1.0",
		"git://user:password@gist.github.com/feedbeef.git": "",
		"git://user:password@gist.github.com/feedbeef.git#v1.0": "v1.0",
		"git://:password@gist.github.com/feedbeef.git": "",
		"git://:password@gist.github.com/feedbeef.git#v1.0": "v1.0",

		"git://gist.github.com/foo/feedbeef": "",
		"git://gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"git://user@gist.github.com/foo/feedbeef": "",
		"git://user@gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"git://user:password@gist.github.com/foo/feedbeef": "",
		"git://user:password@gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"git://:password@gist.github.com/foo/feedbeef": "",
		"git://:password@gist.github.com/foo/feedbeef#v1.0": "v1.0",

		"git://gist.github.com/foo/feedbeef.git": "",
		"git://gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"git://user@gist.github.com/foo/feedbeef.git": "",
		"git://user@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"git://user:password@gist.github.com/foo/feedbeef.git": "",
		"git://user:password@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"git://:password@gist.github.com/foo/feedbeef.git": "",
		"git://:password@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",

		// no-protocol git+ssh
		//
		// NOTE auth is accepted and ignored
		"git@gist.github.com:feedbeef": "",
		"git@gist.github.com:feedbeef#v1.0": "v1.0",
		"user@gist.github.com:feedbeef": "",
		"user@gist.github.com:feedbeef#v1.0": "v1.0",
		"user:password@gist.github.com:feedbeef": "",
		"user:password@gist.github.com:feedbeef#v1.0": "v1.0",
		":password@gist.github.com:feedbeef": "",
		":password@gist.github.com:feedbeef#v1.0": "v1.0",

		"git@gist.github.com:feedbeef.git": "",
		"git@gist.github.com:feedbeef.git#v1.0": "v1.0",
		"user@gist.github.com:feedbeef.git": "",
		"user@gist.github.com:feedbeef.git#v1.0": "v1.0",
		"user:password@gist.github.com:feedbeef.git": "",
		"user:password@gist.github.com:feedbeef.git#v1.0": "v1.0",
		":password@gist.github.com:feedbeef.git": "",
		":password@gist.github.com:feedbeef.git#v1.0": "v1.0",

		"git@gist.github.com:foo/feedbeef": "",
		"git@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"user@gist.github.com:foo/feedbeef": "",
		"user@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"user:password@gist.github.com:foo/feedbeef": "",
		"user:password@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		":password@gist.github.com:foo/feedbeef": "",
		":password@gist.github.com:foo/feedbeef#v1.0": "v1.0",

		"git@gist.github.com:foo/feedbeef.git": "",
		"git@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"user@gist.github.com:foo/feedbeef.git": "",
		"user@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"user:password@gist.github.com:foo/feedbeef.git": "",
		"user:password@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		":password@gist.github.com:foo/feedbeef.git": "",
		":password@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",

		// git+ssh urls
		//
		// NOTE auth is accepted but ignored
		// NOTE see TODO at list of invalids, some inputs fail and shouldn't
		"git+ssh://gist.github.com:feedbeef": "",
		"git+ssh://gist.github.com:feedbeef#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:feedbeef": "",
		"git+ssh://user@gist.github.com:feedbeef#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:feedbeef": "",
		"git+ssh://user:password@gist.github.com:feedbeef#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:feedbeef": "",
		"git+ssh://:password@gist.github.com:feedbeef#v1.0": "v1.0",

		"git+ssh://gist.github.com:feedbeef.git": "",
		"git+ssh://gist.github.com:feedbeef.git#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:feedbeef.git": "",
		"git+ssh://user@gist.github.com:feedbeef.git#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:feedbeef.git": "",
		"git+ssh://user:password@gist.github.com:feedbeef.git#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:feedbeef.git": "",
		"git+ssh://:password@gist.github.com:feedbeef.git#v1.0": "v1.0",

		"git+ssh://gist.github.com:foo/feedbeef": "",
		"git+ssh://gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:foo/feedbeef": "",
		"git+ssh://user@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:foo/feedbeef": "",
		"git+ssh://user:password@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:foo/feedbeef": "",
		"git+ssh://:password@gist.github.com:foo/feedbeef#v1.0": "v1.0",

		"git+ssh://gist.github.com:foo/feedbeef.git": "",
		"git+ssh://gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:foo/feedbeef.git": "",
		"git+ssh://user@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:foo/feedbeef.git": "",
		"git+ssh://user:password@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:foo/feedbeef.git": "",
		"git+ssh://:password@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",

		// ssh urls
		//
		// NOTE auth is accepted but ignored
		"ssh://gist.github.com:feedbeef": "",
		"ssh://gist.github.com:feedbeef#v1.0": "v1.0",
		"ssh://user@gist.github.com:feedbeef": "",
		"ssh://user@gist.github.com:feedbeef#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:feedbeef": "",
		"ssh://user:password@gist.github.com:feedbeef#v1.0": "v1.0",
		"ssh://:password@gist.github.com:feedbeef": "",
		"ssh://:password@gist.github.com:feedbeef#v1.0": "v1.0",

		"ssh://gist.github.com:feedbeef.git": "",
		"ssh://gist.github.com:feedbeef.git#v1.0": "v1.0",
		"ssh://user@gist.github.com:feedbeef.git": "",
		"ssh://user@gist.github.com:feedbeef.git#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:feedbeef.git": "",
		"ssh://user:password@gist.github.com:feedbeef.git#v1.0": "v1.0",
		"ssh://:password@gist.github.com:feedbeef.git": "",
		"ssh://:password@gist.github.com:feedbeef.git#v1.0": "v1.0",

		"ssh://gist.github.com:foo/feedbeef": "",
		"ssh://gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"ssh://user@gist.github.com:foo/feedbeef": "",
		"ssh://user@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:foo/feedbeef": "",
		"ssh://user:password@gist.github.com:foo/feedbeef#v1.0": "v1.0",
		"ssh://:password@gist.github.com:foo/feedbeef": "",
		"ssh://:password@gist.github.com:foo/feedbeef#v1.0": "v1.0",

		"ssh://gist.github.com:foo/feedbeef.git": "",
		"ssh://gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"ssh://user@gist.github.com:foo/feedbeef.git": "",
		"ssh://user@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:foo/feedbeef.git": "",
		"ssh://user:password@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",
		"ssh://:password@gist.github.com:foo/feedbeef.git": "",
		"ssh://:password@gist.github.com:foo/feedbeef.git#v1.0": "v1.0",

		// git+https urls
		//
		// NOTE auth is accepted and respected
		"git+https://gist.github.com/feedbeef": "",
		"git+https://gist.github.com/feedbeef#v1.0": "v1.0",
		"git+https://user@gist.github.com/feedbeef": "",
		"git+https://user@gist.github.com/feedbeef#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/feedbeef": "",
		"git+https://user:password@gist.github.com/feedbeef#v1.0": "v1.0",
		"git+https://:password@gist.github.com/feedbeef": "",
		"git+https://:password@gist.github.com/feedbeef#v1.0": "v1.0",

		"git+https://gist.github.com/feedbeef.git": "",
		"git+https://gist.github.com/feedbeef.git#v1.0": "v1.0",
		"git+https://user@gist.github.com/feedbeef.git": "",
		"git+https://user@gist.github.com/feedbeef.git#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/feedbeef.git": "",
		"git+https://user:password@gist.github.com/feedbeef.git#v1.0": "v1.0",
		"git+https://:password@gist.github.com/feedbeef.git": "",
		"git+https://:password@gist.github.com/feedbeef.git#v1.0": "v1.0",

		"git+https://gist.github.com/foo/feedbeef": "",
		"git+https://gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"git+https://user@gist.github.com/foo/feedbeef": "",
		"git+https://user@gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/foo/feedbeef": "",
		"git+https://user:password@gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"git+https://:password@gist.github.com/foo/feedbeef": "",
		"git+https://:password@gist.github.com/foo/feedbeef#v1.0": "v1.0",

		"git+https://gist.github.com/foo/feedbeef.git": "",
		"git+https://gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"git+https://user@gist.github.com/foo/feedbeef.git": "",
		"git+https://user@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/foo/feedbeef.git": "",
		"git+https://user:password@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"git+https://:password@gist.github.com/foo/feedbeef.git": "",
		"git+https://:password@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",

		// https urls
		//
		// NOTE auth is accepted and respected
		"https://gist.github.com/feedbeef": "",
		"https://gist.github.com/feedbeef#v1.0": "v1.0",
		"https://user@gist.github.com/feedbeef": "",
		"https://user@gist.github.com/feedbeef#v1.0": "v1.0",
		"https://user:password@gist.github.com/feedbeef": "",
		"https://user:password@gist.github.com/feedbeef#v1.0": "v1.0",
		"https://:password@gist.github.com/feedbeef": "",
		"https://:password@gist.github.com/feedbeef#v1.0": "v1.0",

		"https://gist.github.com/feedbeef.git": "",
		"https://gist.github.com/feedbeef.git#v1.0": "v1.0",
		"https://user@gist.github.com/feedbeef.git": "",
		"https://user@gist.github.com/feedbeef.git#v1.0": "v1.0",
		"https://user:password@gist.github.com/feedbeef.git": "",
		"https://user:password@gist.github.com/feedbeef.git#v1.0": "v1.0",
		"https://:password@gist.github.com/feedbeef.git": "",
		"https://:password@gist.github.com/feedbeef.git#v1.0": "v1.0",

		"https://gist.github.com/foo/feedbeef": "",
		"https://gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"https://user@gist.github.com/foo/feedbeef": "",
		"https://user@gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"https://user:password@gist.github.com/foo/feedbeef": "",
		"https://user:password@gist.github.com/foo/feedbeef#v1.0": "v1.0",
		"https://:password@gist.github.com/foo/feedbeef": "",
		"https://:password@gist.github.com/foo/feedbeef#v1.0": "v1.0",

		"https://gist.github.com/foo/feedbeef.git": "",
		"https://gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"https://user@gist.github.com/foo/feedbeef.git": "",
		"https://user@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"https://user:password@gist.github.com/foo/feedbeef.git": "",
		"https://user:password@gist.github.com/foo/feedbeef.git#v1.0": "v1.0",
		"https://:password@gist.github.com/foo/feedbeef.git": "",
		"https://:password@gist.github.com/foo/feedbeef.git#v1.0": "v1.0"
	};

	const otherDomainValid = {
		"https://other.com/foo/bar.git#v1.0": "v1.0",
		"ssh://other.com:foo/bar.git#v1.0": "v1.0",
		"user@other.com:foo/bar#v1.0": "v1.0"
	};

	const otherDomainInvalid = ["other:foo/bar#v1.0"];

	it("should return empty string for some invalid URL deps", () => {
		for (const url of commonInvalid) {
			expect(normalizeVersion(url)).toBe("");
		}
	});

	it("should get correct version for some valid URL deps", () => {
		for (const url of Object.keys(commonValid)) {
			expect(normalizeVersion(url)).toBe(commonValid[url]);
		}
	});

	it("should return empty string for github invalid URL deps", () => {
		for (const url of githubInvalid) {
			expect(normalizeVersion(url)).toBe("");
		}
	});

	it("should get correct version for github URL deps", () => {
		for (const url of Object.keys(githubValid)) {
			expect(normalizeVersion(url)).toBe(githubValid[url]);
		}
	});

	it("should return empty string for gitlab invalid URL deps", () => {
		for (const url of gitlabInvalid) {
			expect(normalizeVersion(url)).toBe("");
		}
	});

	it("should get correct version for gitlab URL deps", () => {
		for (const url of Object.keys(gitlabValid)) {
			expect(normalizeVersion(url)).toBe(gitlabValid[url]);
		}
	});

	it("should return empty string for bitbucket invalid URL deps", () => {
		for (const url of bitbucketInvalid) {
			expect(normalizeVersion(url)).toBe("");
		}
	});

	it("should get correct version for bitbucket URL deps", () => {
		for (const url of Object.keys(bitbucketValid)) {
			expect(normalizeVersion(url)).toBe(bitbucketValid[url]);
		}
	});

	it("should return empty string for gist invalid URL deps", () => {
		for (const url of gistInvalid) {
			expect(normalizeVersion(url)).toBe("");
		}
	});

	it("should get correct version for gist URL deps", () => {
		for (const url of Object.keys(gistValid)) {
			expect(normalizeVersion(url)).toBe(gistValid[url]);
		}
	});

	it("should return empty string for other domain invalid URL deps", () => {
		for (const url of otherDomainInvalid) {
			expect(normalizeVersion(url)).toBe("");
		}
	});

	it("should return correct version for other domain URL deps", () => {
		for (const url of Object.keys(otherDomainValid)) {
			expect(normalizeVersion(url)).toBe(otherDomainValid[url]);
		}
	});
});
