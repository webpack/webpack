---
"webpack": minor
---

Add `watchOptions.additional` to specify extra files or directories that should trigger a rebuild when changed, even when they are not part of the dependency graph. Useful for files read at configuration time (for example, content passed to `BannerPlugin`) that would otherwise not be tracked by the watcher.
