# Lottus video validation — September 2026

All public showcase videos were rebuilt with frame-by-frame animation and browser-friendly H.264 MP4 encoding.

| Video | Codec | Size | FPS | Duration | Frames | Fast start |
|---|---|---:|---:|---:|---:|---|
| `integrations-showcase.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `lottus-showreel.mp4` | h264 | 1280×720 | 24/1 | 28.0s | 672 | yes |
| `platform-flow.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `please-admin-dashboard.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `please-billing-reporting.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `please-master-calendar.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `please-service-requests.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `portals-showcase.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `portfolio-loop.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `systems-showcase.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |
| `websites-showcase.mp4` | h264 | 1280×720 | 24/1 | 7.0s | 168 | yes |

## Runtime behavior

- Videos are muted, looping and inline-playable.
- The runtime retries autoplay on load, `canplay`, visibility changes and when a video enters the viewport.
- `prefers-reduced-motion` is applied to decorative reveal transitions only; it no longer disables product/showcase videos.
- Native controls appear only as a fallback if the browser actually rejects autoplay.
- The four PLEASE videos are distinct module-specific animations: Admin Dashboard, Service Requests, Master Calendar, and Billing & Reporting.