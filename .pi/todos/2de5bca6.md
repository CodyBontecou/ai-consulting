{
  "id": "2de5bca6",
  "title": "Fix mobile lesson card text overflow on curriculum page",
  "tags": [
    "bugfix",
    "ui",
    "mobile"
  ],
  "status": "completed",
  "created_at": "2026-03-09T19:59:45.387Z"
}

Implemented responsive fixes in `styles.css` for mobile lesson cards:

- Reduced mobile lesson card typography slightly (`lesson-num`, title, duration)
- Removed the desktop-only right padding from `.session .duration` on mobile so teaser text can use full width
- Added wrapping safeguards for titles and duration text
- Made the mobile `View lesson` CTA a block element with spacing below the teaser
- Slightly tightened mobile card padding

Validated with a Playwright mobile screenshot at `/tmp/ai-consulting-mobile-after.png`; Lesson 3 teaser now wraps correctly instead of overflowing.
