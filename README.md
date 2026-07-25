# Learning Hub

A static learning library for useful courses across any subject, deployed to Cloudflare Pages. Serves as a personal learning library — not a platform, not dynamic, just clean pre-built HTML. Courses may come from Teach sessions, contributed content, or other workflows.

## Adding a New Course

Each course is a directory under `content/courses/` containing a `metadata.json` and a `lessons/` subdirectory with lesson files.

### Directory Structure

```
content/courses/
└── my-course/          # URL-safe slug (no spaces, lowercase, hyphens ok)
    ├── metadata.json    # Course-level info
    └── lessons/
        ├── 01-intro.html       # Lesson content (required)
        ├── 01-intro.json       # Lesson metadata (optional)
        ├── 02-deep-dive.html
        └── 02-deep-dive.json
```

### Step-by-Step: Adding a Course

1. **Create the course directory** under `content/courses/` with a URL-safe slug (e.g., `intro-rust`).

2. **Create `metadata.json`** in the course directory:

```json
{
  "title": "Introduction to Rust",
  "description": "Learn Rust fundamentals from ownership to traits",
  "tags": ["rust", "systems", "beginner"],
  "lastUpdated": "2024-07-01",
  "icon": "🦀",
  "coverImage": null
}
```

### `metadata.json` Fields

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes | Display name of the course |
| `description` | Yes | One-paragraph summary shown on the home and course pages |
| `tags` | No | Array of strings for filtering/search (lowercase) |
| `lastUpdated` | No | ISO date string when the course was last revised |
| `icon` | No | Single emoji shown next to the title (e.g., `🐍`, `📘`) |
| `coverImage` | No | Path or URL to a cover image, or `null` |

3. **Create the `lessons/` subdirectory** and add your lesson files.

### Lesson Files

Each lesson needs two files in the `lessons/` directory:

- **`.html`** (required) — Full HTML body content. This gets injected into the lesson template. Use `{{COURSE_TITLE}}` and `{{COURSE_SLUG}}` as placeholders if needed.
- **`.json`** (optional) — Metadata sidecar with the same base filename:

```json
{
  "title": "Ownership and Borrowing",
  "description": "Understanding Rust's ownership system"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `title` | Yes (in JSON) | Display title on course page and navigation. Falls back to filename if JSON is missing. |
| `description` | No | Short summary shown under the lesson link |

Lessons are listed in **alphabetical order** by filename. Use numeric prefixes (`01-`, `02-`) to control ordering.

### Complete Example

To add an "Introduction to Rust" course:

```
content/courses/intro-rust/
├── metadata.json
└── lessons/
    ├── 01-ownership.html
    ├── 01-ownership.json
    ├── 02-traits.html
    └── 02-traits.json
```

**`metadata.json`:**
```json
{
  "title": "Introduction to Rust",
  "description": "A hands-on introduction to the Rust programming language",
  "tags": ["rust", "systems-programming"],
  "lastUpdated": "2024-07-15",
  "icon": "🦀"
}
```

**`lessons/01-ownership.json`:**
```json
{
  "title": "Ownership and Borrowing",
  "description": "Rust's core memory model explained"
}
```

**`lessons/01-ownership.html`:**
```html
<h2>What is Ownership?</h2>
<p>Ownership is Rust's most unique feature...</p>
<pre><code>let s = String::from("hello");</code></pre>
```

## Building Locally

```bash
npm ci          # install dependencies
npm run build   # runs node build.js → output in dist/
npm run preview # build + serve locally at localhost:3000
```

## Deployment

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`):

1. Checkout → Setup Node 20 → `npm ci`
2. `npm run build` generates `dist/`
3. `cloudflare/pages-action` deploys `dist/` to Cloudflare Pages

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages edit permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_PROJECT_NAME` | The Pages project name in Cloudflare |

## Project Layout

```
learning-hub/
├── .github/workflows/deploy.yml  # CI/CD pipeline
├── assets/                        # Static files (CSS, images) copied to dist/
├── build.js                       # Static site generator
├── content/courses/               # Source content (one dir per course)
├── dist/                          # Build output (gitignored)
├── package.json
└── templates/                     # HTML templates (home, course, lesson pages)
```

## Design Principles

- **Static-first** — Everything pre-built; no server, no database, no SSR
- **Content-first** — UI stays out of the way; the content is the star
- **Minimal JavaScript** — Only where necessary (client-side search on the home page)
- **Simple to extend** — Adding a course is creating files in a directory, nothing more
