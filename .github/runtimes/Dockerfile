# Not built: it pins the Bun and Deno versions the `runtimes` job in test.yml
# runs, in a file Dependabot's docker ecosystem keeps up to date. A new release
# then arrives as its own pull request, rather than turning an unrelated one red.
FROM oven/bun:1.4.3@sha256:ec06c3b6cea04192ae6770c434f668ca41d343ad19fa6472216c7b48be39c598 AS bun
FROM denoland/deno:2.9.7@sha256:fa335acdf6b72106eda2cb6a8cb5f4187e7630e357467489db4b2e7352d5e432 AS deno
