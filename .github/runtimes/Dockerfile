# Not built: it pins the Bun and Deno versions the `runtimes` job in test.yml
# runs, in a file Dependabot's docker ecosystem keeps up to date. A new release
# then arrives as its own pull request, rather than turning an unrelated one red.
FROM oven/bun:1.4.3 AS bun
FROM denoland/deno:2.9.7 AS deno
