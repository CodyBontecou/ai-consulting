# AI for Programmers

A small static marketing site for the **AI for Programmers** workshop.

It presents:

- a 5-day workshop schedule
- 15 lesson/session summaries
- mobile and desktop lesson detail views
- instructor bios
- branding assets like favicons and the web manifest

The site is built with plain HTML, CSS, and JavaScript—there is no build step, framework, or package install required.

## Project structure

- `index.html` — page content and workshop curriculum
- `styles.css` — all visual styling, layout, and responsive behavior
- `script.js` — interactive lesson navigation and drawer/page behavior
- `public/` — favicon and manifest assets

## How to run it locally

No server is required.

You can open `index.html` directly in your browser:

```text
file:///path/to/ai-consulting/index.html
```

or just double-click the file in Finder.

If you prefer, you can still use any static file server, but it is optional.

## How it works

- Clicking a lesson in the schedule opens the full lesson details.
- On mobile, lesson details open in a bottom drawer.
- On desktop, lesson details open in a dedicated detail panel/page section.
- The current lesson can be deep-linked with a query parameter like:

```text
index.html?lesson=7
```

## Deployment

This can be deployed to any static host, including:

- Cloudflare Pages
- Netlify
- GitHub Pages
- Vercel static hosting

The asset paths are relative, so the site can be hosted at the root or under a subpath without changing the favicon or manifest links.

## Editing notes

- Update workshop copy and lesson content in `index.html`.
- Update interaction behavior in `script.js`.
- Update visuals and responsive styles in `styles.css`.
