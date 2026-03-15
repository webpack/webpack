---
"webpack": patch
---

Fix incorrect condition in FileSystemInfo that always evaluated to false, preventing trailing slash removal from directory paths during build dependency resolution.
