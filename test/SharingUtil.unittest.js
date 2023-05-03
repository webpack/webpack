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
		"http://github.com/npm/cli.git#v1.0": "v1.0",
		// for uppercase
		"http://GITHUB.com/npm/cli.git#v1.0": "v1.0",
		"HTTP://github.com/npm/cli.git#v1.0": "v1.0",
		"FILE://foo/bar": "",
		"file://foo/bar": "",
		"v1.2": "v1.2",
		"^1.2.0": "^1.2.0",
		"git://localhost:12345/foo/bar#v1.0": "v1.0",
		"localhost:foo/bar#v1.0": "v1.0"
	};

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
		"foo/bar#branch with space": "branch with space",
		"https://github.com/foo/bar/tree/branch": "branch",
		"user..test--/..foo-js# . . . . . some . tags / / /":
			" . . . . . some . tags / / /"
	};

	const gitlabInvalid = [
		// gitlab urls can contain a /-/ segment, make sure we ignore those
		"https://gitlab.com/foo/-/something",
		// missing project
		"https://gitlab.com/foo",
		// tarball, this should not parse so that it can be used for a remote package fetcher
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
		// NOTE sub projects are accepted, but the sub project is treated as the project and the real project is lost
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
		// NOTE sub projects are accepted, but the sub project is treated as the project and the real project is lost
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
		// NOTE sub projects are accepted, but the sub project is treated as the project and the real project is lost
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
		// NOTE sub projects are accepted, but the sub project is treated as the project and the real project is lost
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
		// shortcuts
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
		"https://gist.github.com/foo/feed/raw/fix%2Fbug/",
		// missing both user and project
		"https://gist.github.com/"
	];

	const gistValid = {
		// shortcuts
		//
		// NOTE auth is accepted but ignored
		"gist:feed": "",
		"gist:feed#v1.0": "v1.0",
		"gist:user@feed": "",
		"gist:user@feed#v1.0": "v1.0",
		"gist:user:password@feed": "",
		"gist:user:password@feed#v1.0": "v1.0",
		"gist::password@feed": "",
		"gist::password@feed#v1.0": "v1.0",

		"gist:feed.git": "",
		"gist:feed.git#v1.0": "v1.0",
		"gist:user@feed.git": "",
		"gist:user@feed.git#v1.0": "v1.0",
		"gist:user:password@feed.git": "",
		"gist:user:password@feed.git#v1.0": "v1.0",
		"gist::password@feed.git": "",
		"gist::password@feed.git#v1.0": "v1.0",

		"gist:/feed": "",
		"gist:/feed#v1.0": "v1.0",
		"gist:user@/feed": "",
		"gist:user@/feed#v1.0": "v1.0",
		"gist:user:password@/feed": "",
		"gist:user:password@/feed#v1.0": "v1.0",
		"gist::password@/feed": "",
		"gist::password@/feed#v1.0": "v1.0",

		"gist:/feed.git": "",
		"gist:/feed.git#v1.0": "v1.0",
		"gist:user@/feed.git": "",
		"gist:user@/feed.git#v1.0": "v1.0",
		"gist:user:password@/feed.git": "",
		"gist:user:password@/feed.git#v1.0": "v1.0",
		"gist::password@/feed.git": "",
		"gist::password@/feed.git#v1.0": "v1.0",

		"gist:foo/feed": "",
		"gist:foo/feed#v1.0": "v1.0",
		"gist:user@foo/feed": "",
		"gist:user@foo/feed#v1.0": "v1.0",
		"gist:user:password@foo/feed": "",
		"gist:user:password@foo/feed#v1.0": "v1.0",
		"gist::password@foo/feed": "",
		"gist::password@foo/feed#v1.0": "v1.0",

		"gist:foo/feed.git": "",
		"gist:foo/feed.git#v1.0": "v1.0",
		"gist:user@foo/feed.git": "",
		"gist:user@foo/feed.git#v1.0": "v1.0",
		"gist:user:password@foo/feed.git": "",
		"gist:user:password@foo/feed.git#v1.0": "v1.0",
		"gist::password@foo/feed.git": "",
		"gist::password@foo/feed.git#v1.0": "v1.0",

		// git urls
		//
		// NOTE auth is accepted and respected
		"git://gist.github.com/feed": "",
		"git://gist.github.com/feed#v1.0": "v1.0",
		"git://user@gist.github.com/feed": "",
		"git://user@gist.github.com/feed#v1.0": "v1.0",
		"git://user:password@gist.github.com/feed": "",
		"git://user:password@gist.github.com/feed#v1.0": "v1.0",
		"git://:password@gist.github.com/feed": "",
		"git://:password@gist.github.com/feed#v1.0": "v1.0",

		"git://gist.github.com/feed.git": "",
		"git://gist.github.com/feed.git#v1.0": "v1.0",
		"git://user@gist.github.com/feed.git": "",
		"git://user@gist.github.com/feed.git#v1.0": "v1.0",
		"git://user:password@gist.github.com/feed.git": "",
		"git://user:password@gist.github.com/feed.git#v1.0": "v1.0",
		"git://:password@gist.github.com/feed.git": "",
		"git://:password@gist.github.com/feed.git#v1.0": "v1.0",

		"git://gist.github.com/foo/feed": "",
		"git://gist.github.com/foo/feed#v1.0": "v1.0",
		"git://user@gist.github.com/foo/feed": "",
		"git://user@gist.github.com/foo/feed#v1.0": "v1.0",
		"git://user:password@gist.github.com/foo/feed": "",
		"git://user:password@gist.github.com/foo/feed#v1.0": "v1.0",
		"git://:password@gist.github.com/foo/feed": "",
		"git://:password@gist.github.com/foo/feed#v1.0": "v1.0",

		"git://gist.github.com/foo/feed.git": "",
		"git://gist.github.com/foo/feed.git#v1.0": "v1.0",
		"git://user@gist.github.com/foo/feed.git": "",
		"git://user@gist.github.com/foo/feed.git#v1.0": "v1.0",
		"git://user:password@gist.github.com/foo/feed.git": "",
		"git://user:password@gist.github.com/foo/feed.git#v1.0": "v1.0",
		"git://:password@gist.github.com/foo/feed.git": "",
		"git://:password@gist.github.com/foo/feed.git#v1.0": "v1.0",

		// no-protocol git+ssh
		//
		// NOTE auth is accepted and ignored
		"git@gist.github.com:feed": "",
		"git@gist.github.com:feed#v1.0": "v1.0",
		"user@gist.github.com:feed": "",
		"user@gist.github.com:feed#v1.0": "v1.0",
		"user:password@gist.github.com:feed": "",
		"user:password@gist.github.com:feed#v1.0": "v1.0",
		":password@gist.github.com:feed": "",
		":password@gist.github.com:feed#v1.0": "v1.0",

		"git@gist.github.com:feed.git": "",
		"git@gist.github.com:feed.git#v1.0": "v1.0",
		"user@gist.github.com:feed.git": "",
		"user@gist.github.com:feed.git#v1.0": "v1.0",
		"user:password@gist.github.com:feed.git": "",
		"user:password@gist.github.com:feed.git#v1.0": "v1.0",
		":password@gist.github.com:feed.git": "",
		":password@gist.github.com:feed.git#v1.0": "v1.0",

		"git@gist.github.com:foo/feed": "",
		"git@gist.github.com:foo/feed#v1.0": "v1.0",
		"user@gist.github.com:foo/feed": "",
		"user@gist.github.com:foo/feed#v1.0": "v1.0",
		"user:password@gist.github.com:foo/feed": "",
		"user:password@gist.github.com:foo/feed#v1.0": "v1.0",
		":password@gist.github.com:foo/feed": "",
		":password@gist.github.com:foo/feed#v1.0": "v1.0",

		"git@gist.github.com:foo/feed.git": "",
		"git@gist.github.com:foo/feed.git#v1.0": "v1.0",
		"user@gist.github.com:foo/feed.git": "",
		"user@gist.github.com:foo/feed.git#v1.0": "v1.0",
		"user:password@gist.github.com:foo/feed.git": "",
		"user:password@gist.github.com:foo/feed.git#v1.0": "v1.0",
		":password@gist.github.com:foo/feed.git": "",
		":password@gist.github.com:foo/feed.git#v1.0": "v1.0",

		// git+ssh urls
		//
		// NOTE auth is accepted but ignored
		// NOTE see TODO at list of invalids, some inputs fail and shouldn't
		"git+ssh://gist.github.com:feed": "",
		"git+ssh://gist.github.com:feed#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:feed": "",
		"git+ssh://user@gist.github.com:feed#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:feed": "",
		"git+ssh://user:password@gist.github.com:feed#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:feed": "",
		"git+ssh://:password@gist.github.com:feed#v1.0": "v1.0",

		"git+ssh://gist.github.com:feed.git": "",
		"git+ssh://gist.github.com:feed.git#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:feed.git": "",
		"git+ssh://user@gist.github.com:feed.git#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:feed.git": "",
		"git+ssh://user:password@gist.github.com:feed.git#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:feed.git": "",
		"git+ssh://:password@gist.github.com:feed.git#v1.0": "v1.0",

		"git+ssh://gist.github.com:foo/feed": "",
		"git+ssh://gist.github.com:foo/feed#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:foo/feed": "",
		"git+ssh://user@gist.github.com:foo/feed#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:foo/feed": "",
		"git+ssh://user:password@gist.github.com:foo/feed#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:foo/feed": "",
		"git+ssh://:password@gist.github.com:foo/feed#v1.0": "v1.0",

		"git+ssh://gist.github.com:foo/feed.git": "",
		"git+ssh://gist.github.com:foo/feed.git#v1.0": "v1.0",
		"git+ssh://user@gist.github.com:foo/feed.git": "",
		"git+ssh://user@gist.github.com:foo/feed.git#v1.0": "v1.0",
		"git+ssh://user:password@gist.github.com:foo/feed.git": "",
		"git+ssh://user:password@gist.github.com:foo/feed.git#v1.0": "v1.0",
		"git+ssh://:password@gist.github.com:foo/feed.git": "",
		"git+ssh://:password@gist.github.com:foo/feed.git#v1.0": "v1.0",

		// ssh urls
		//
		// NOTE auth is accepted but ignored
		"ssh://gist.github.com:feed": "",
		"ssh://gist.github.com:feed#v1.0": "v1.0",
		"ssh://user@gist.github.com:feed": "",
		"ssh://user@gist.github.com:feed#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:feed": "",
		"ssh://user:password@gist.github.com:feed#v1.0": "v1.0",
		"ssh://:password@gist.github.com:feed": "",
		"ssh://:password@gist.github.com:feed#v1.0": "v1.0",

		"ssh://gist.github.com:feed.git": "",
		"ssh://gist.github.com:feed.git#v1.0": "v1.0",
		"ssh://user@gist.github.com:feed.git": "",
		"ssh://user@gist.github.com:feed.git#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:feed.git": "",
		"ssh://user:password@gist.github.com:feed.git#v1.0": "v1.0",
		"ssh://:password@gist.github.com:feed.git": "",
		"ssh://:password@gist.github.com:feed.git#v1.0": "v1.0",

		"ssh://gist.github.com:foo/feed": "",
		"ssh://gist.github.com:foo/feed#v1.0": "v1.0",
		"ssh://user@gist.github.com:foo/feed": "",
		"ssh://user@gist.github.com:foo/feed#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:foo/feed": "",
		"ssh://user:password@gist.github.com:foo/feed#v1.0": "v1.0",
		"ssh://:password@gist.github.com:foo/feed": "",
		"ssh://:password@gist.github.com:foo/feed#v1.0": "v1.0",

		"ssh://gist.github.com:foo/feed.git": "",
		"ssh://gist.github.com:foo/feed.git#v1.0": "v1.0",
		"ssh://user@gist.github.com:foo/feed.git": "",
		"ssh://user@gist.github.com:foo/feed.git#v1.0": "v1.0",
		"ssh://user:password@gist.github.com:foo/feed.git": "",
		"ssh://user:password@gist.github.com:foo/feed.git#v1.0": "v1.0",
		"ssh://:password@gist.github.com:foo/feed.git": "",
		"ssh://:password@gist.github.com:foo/feed.git#v1.0": "v1.0",

		// git+https urls
		//
		// NOTE auth is accepted and respected
		"git+https://gist.github.com/feed": "",
		"git+https://gist.github.com/feed#v1.0": "v1.0",
		"git+https://user@gist.github.com/feed": "",
		"git+https://user@gist.github.com/feed#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/feed": "",
		"git+https://user:password@gist.github.com/feed#v1.0": "v1.0",
		"git+https://:password@gist.github.com/feed": "",
		"git+https://:password@gist.github.com/feed#v1.0": "v1.0",

		"git+https://gist.github.com/feed.git": "",
		"git+https://gist.github.com/feed.git#v1.0": "v1.0",
		"git+https://user@gist.github.com/feed.git": "",
		"git+https://user@gist.github.com/feed.git#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/feed.git": "",
		"git+https://user:password@gist.github.com/feed.git#v1.0": "v1.0",
		"git+https://:password@gist.github.com/feed.git": "",
		"git+https://:password@gist.github.com/feed.git#v1.0": "v1.0",

		"git+https://gist.github.com/foo/feed": "",
		"git+https://gist.github.com/foo/feed#v1.0": "v1.0",
		"git+https://user@gist.github.com/foo/feed": "",
		"git+https://user@gist.github.com/foo/feed#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/foo/feed": "",
		"git+https://user:password@gist.github.com/foo/feed#v1.0": "v1.0",
		"git+https://:password@gist.github.com/foo/feed": "",
		"git+https://:password@gist.github.com/foo/feed#v1.0": "v1.0",

		"git+https://gist.github.com/foo/feed.git": "",
		"git+https://gist.github.com/foo/feed.git#v1.0": "v1.0",
		"git+https://user@gist.github.com/foo/feed.git": "",
		"git+https://user@gist.github.com/foo/feed.git#v1.0": "v1.0",
		"git+https://user:password@gist.github.com/foo/feed.git": "",
		"git+https://user:password@gist.github.com/foo/feed.git#v1.0": "v1.0",
		"git+https://:password@gist.github.com/foo/feed.git": "",
		"git+https://:password@gist.github.com/foo/feed.git#v1.0": "v1.0",

		// https urls
		//
		// NOTE auth is accepted and respected
		"https://gist.github.com/feed": "",
		"https://gist.github.com/feed#v1.0": "v1.0",
		"https://user@gist.github.com/feed": "",
		"https://user@gist.github.com/feed#v1.0": "v1.0",
		"https://user:password@gist.github.com/feed": "",
		"https://user:password@gist.github.com/feed#v1.0": "v1.0",
		"https://:password@gist.github.com/feed": "",
		"https://:password@gist.github.com/feed#v1.0": "v1.0",

		"https://gist.github.com/feed.git": "",
		"https://gist.github.com/feed.git#v1.0": "v1.0",
		"https://user@gist.github.com/feed.git": "",
		"https://user@gist.github.com/feed.git#v1.0": "v1.0",
		"https://user:password@gist.github.com/feed.git": "",
		"https://user:password@gist.github.com/feed.git#v1.0": "v1.0",
		"https://:password@gist.github.com/feed.git": "",
		"https://:password@gist.github.com/feed.git#v1.0": "v1.0",

		"https://gist.github.com/foo/feed": "",
		"https://gist.github.com/foo/feed#v1.0": "v1.0",
		"https://user@gist.github.com/foo/feed": "",
		"https://user@gist.github.com/foo/feed#v1.0": "v1.0",
		"https://user:password@gist.github.com/foo/feed": "",
		"https://user:password@gist.github.com/foo/feed#v1.0": "v1.0",
		"https://:password@gist.github.com/foo/feed": "",
		"https://:password@gist.github.com/foo/feed#v1.0": "v1.0",

		"https://gist.github.com/foo/feed.git": "",
		"https://gist.github.com/foo/feed.git#v1.0": "v1.0",
		"https://user@gist.github.com/foo/feed.git": "",
		"https://user@gist.github.com/foo/feed.git#v1.0": "v1.0",
		"https://user:password@gist.github.com/foo/feed.git": "",
		"https://user:password@gist.github.com/foo/feed.git#v1.0": "v1.0",
		"https://:password@gist.github.com/foo/feed.git": "",
		"https://:password@gist.github.com/foo/feed.git#v1.0": "v1.0"
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
