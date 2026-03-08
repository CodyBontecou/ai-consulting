{
  "id": "efbddf35",
  "title": "Center align email icon on mobile",
  "tags": [
    "frontend",
    "css",
    "mobile"
  ],
  "status": "done",
  "created_at": "2026-03-08T21:32:03.348Z"
}

Centered the email icon on mobile by overriding `.team-avatar-wrapper` inside the existing `@media (max-width: 768px)` block in `index.html` to use `align-items: center;`. This keeps desktop unchanged and centers the mail icon beneath each avatar on small screens.
