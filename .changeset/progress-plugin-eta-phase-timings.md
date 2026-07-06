---
"webpack": minor
---

Add built-in build progress via `infrastructureLogging.progress` (`true` or `"auto"`; `"auto"` shows the bar only for interactive terminals and stays silent in CI), plus `estimatedTime`, `phaseTimings`, progress bar `width`, and `progressBar: "auto"` on `ProgressPlugin`. This supersedes third-party progress plugins such as WebpackBar, which is no longer needed — use the built-in progress instead.
