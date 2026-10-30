# Unified school screen UI

Version: 20261030-unified1. Shared tokens and self-hosted IBM Plex Sans Thai fonts: https://drivekup01.github.io/School-Portal/shared/school-ui.css

Purple #8236b5, dark sidebar #342047, white cards, canvas #f7f5fa; body 16px, labels 14px, notes 13px, page title 28px (mobile 24px). Compact timetable cells retain their dense sizes. Official printed forms retain their document fonts and A4 measurements.

Active HTML loads the bundles listed in styles/ui-manifest.json, followed by the shared screen stylesheet. Source component CSS is retained as the build input; avoid adding it again alongside its bundle. Edit source CSS then rebuild before publishing.

With these repositories checked out as sibling folders, install pinned dev dependencies in School-Portal/tools/ui-build (pnpm install), then run from that folder:

    node build.cjs ../../../School-Budget

School-OS classic scripts retain their execution boundaries. timetable-app.js, timetable-head.js and timetable-runtime-*.js are the readable canonical runtime sources extracted from HTML; edit them directly. Keep their classic script order and boundaries. vendor/docx.min.js and vendor/html2canvas.min.js load on the first matching export; subsequent exports reuse the same library. No data or authorization backend changes are required.

School-Attendance remains the canonical attendance UI. Portal/scripts/sync-attendance.py copies its static pages, whose common bundle URL points to School-Portal/styles/attendance-base.css. Publish the Portal shared assets first.
