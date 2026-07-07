---
"webpack": minor
---

Add built-in build progress via `infrastructureLogging.progress` (`"auto"` shows the bar only in interactive terminals; default `"auto"` under `experiments.futureDefaults`), plus `estimatedTime`, `phaseTimings`, progress bar `width`, and `progressBar: "auto"` on `ProgressPlugin`. This supersedes third-party progress plugins such as WebpackBar, which is no longer needed — use the built-in progress instead.
