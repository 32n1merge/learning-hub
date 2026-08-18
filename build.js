import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = 'content';
const DIST_DIR = 'dist';
const TEMPLATES_DIR = 'templates';
const SITE_URL = 'https://learn.32n1.com';

async function build() {
  console.log('Building Learning Hub...');
  
  // Clean dist
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
  
  // Read all courses
  const courses = await readCourses();
  console.log(`Found ${courses.length} course(s)`);
  
  // Generate home page
  await generateHomePage(courses);
  
  // Generate course pages and lessons
  for (const course of courses) {
    await generateCoursePage(course);
    await generateLessonPages(course);
  }
  
  // Copy static assets
  await copyAssets();
  
  // Generate RSS feed
  await fs.writeFile(path.join(DIST_DIR, 'feed.xml'), buildRssFeed(courses));
  
  console.log('Build complete!');
}

async function readCourses() {
  const coursesDir = path.join(CONTENT_DIR, 'courses');
  
  if (!await fileExists(coursesDir)) {
    console.warn('Warning: content/courses directory not found, creating it...');
    await fs.mkdir(coursesDir, { recursive: true });
    return [];
  }
  
  const courseDirs = await fs.readdir(coursesDir);
  
  const courses = [];
  for (const dir of courseDirs) {
    const coursePath = path.join(coursesDir, dir);
    const stat = await fs.stat(coursePath);
    
    if (stat.isDirectory()) {
      const metadataPath = path.join(coursePath, 'metadata.json');
      
      if (!await fileExists(metadataPath)) {
        console.warn(`Warning: ${metadataPath} not found, skipping course ${dir}`);
        continue;
      }
      
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      // Read lessons
      const lessonsDir = path.join(coursePath, 'lessons');
      const lessons = [];
      
      if (await fileExists(lessonsDir)) {
        const lessonFiles = await fs.readdir(lessonsDir);
        
        for (const file of lessonFiles.sort()) {
          if (file.endsWith('.html')) {
            const lessonPath = path.join(lessonsDir, file);
            const content = await fs.readFile(lessonPath, 'utf-8');
            const lessonMetadataPath = path.join(lessonsDir, file.replace('.html', '.json'));
            let lessonMetadata = { title: file.replace('.html', '') };
            
            if (await fileExists(lessonMetadataPath)) {
              lessonMetadata = JSON.parse(await fs.readFile(lessonMetadataPath, 'utf-8'));
            }
            
            lessons.push({
              slug: file.replace('.html', ''),
              ...lessonMetadata,
              content
            });
          }
        }
      }
      
      courses.push({
        slug: dir,
        ...metadata,
        lessons
      });
    }
  }
  
  return courses;
}

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

function buildTopicsSection(courses) {
  // Aggregate all course tags into a deduped, sorted topic list.
  const topicSet = new Set();
  for (const course of courses) {
    for (const tag of (course.tags || [])) {
      const t = String(tag).trim().toLowerCase();
      if (t) topicSet.add(t);
    }
  }
  const topics = [...topicSet].sort();
  if (topics.length === 0) return '';

  const chips = [
    `<button type="button" class="topic-chip topic-chip-all active" data-topic="" aria-pressed="true">All</button>`,
    ...topics.map(t =>
      `<button type="button" class="topic-chip" data-topic="${t}" aria-pressed="false">${t}</button>`
    )
  ].join('\n');

  return `
    <section id="topics" class="topics-section" aria-label="Browse courses by topic">
      <h2 class="section-title">Browse by Topic</h2>
      <div class="topic-chips" role="group" aria-label="Filter courses by topic">
${chips}
      </div>
    </section>`;
}

function buildCourseCard(course) {
  const searchableText = [
    course.title,
    course.description,
    ...(course.tags || []),
    course.category || ''
  ].join(' ').toLowerCase();

  const topicsAttr = (course.tags || [])
    .map(t => String(t).trim().toLowerCase())
    .join(',');

  const coverImageHtml = course.coverImage
    ? `<img src="${course.coverImage}" alt="${course.title}" class="course-cover">`
    : '';

  const difficultyBadge = course.difficulty
    ? `<span class="difficulty-badge difficulty-${course.difficulty}">${course.difficulty}</span>`
    : '';

  const tagsHtml = course.tags
    ? `<div class="course-card-tags">${course.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`
    : '';

  return `
    <article class="course-card" data-search-text="${searchableText.replace(/"/g, '&quot;')}" data-topics="${topicsAttr.replace(/"/g, '&quot;')}">
      ${coverImageHtml}
      <div class="course-card-body">
        <div class="course-card-header">
          <h2><a href="/courses/${course.slug}/index.html">${course.icon || ''} ${course.title}</a></h2>
          ${difficultyBadge}
        </div>
        <p>${course.description}</p>
        <div class="course-card-meta">
          <span class="meta-item">${course.lessons.length} lesson${course.lessons.length !== 1 ? 's' : ''}</span>
          ${course.estimatedDuration ? `<span class="meta-item meta-duration">${course.estimatedDuration}</span>` : ''}
          ${course.lastUpdated ? `<span class="meta-item">Updated: ${course.lastUpdated}</span>` : ''}
        </div>
        ${tagsHtml}
      </div>
    </article>`;
}

function buildRecentlyUpdated(courses) {
  const sorted = [...courses]
    .filter(c => c.lastUpdated)
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
    .slice(0, 3);

  if (sorted.length === 0) return '';

  const cards = sorted.map(c => `
    <div class="recently-updated-card">
      <a href="/courses/${c.slug}/index.html" class="recently-updated-link">
        <span class="recently-updated-icon">${c.icon || '📄'}</span>
        <span class="recently-updated-title">${c.title}</span>
        <span class="recently-updated-date">${c.lastUpdated}</span>
      </a>
    </div>
  `).join('');

  return `
    <section class="recently-updated">
      <h2 class="section-title">Recently Updated</h2>
      <div class="recently-updated-list">${cards}</div>
    </section>`;
}

async function generateHomePage(courses) {
  const template = await fs.readFile(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');

  const courseCards = courses.map(buildCourseCard).join('\n');
  const recentlyUpdatedHtml = buildRecentlyUpdated(courses);
  const topicsSectionHtml = buildTopicsSection(courses);

  const html = template
    .replace('{{COURSE_CARDS}}', courseCards)
    .replace('{{TOPICS_SECTION}}', topicsSectionHtml)
    .replace('{{RECENTLY_UPDATED}}', recentlyUpdatedHtml);

  await fs.writeFile(path.join(DIST_DIR, 'index.html'), html);
}

async function generateCoursePage(course) {
  const template = await fs.readFile(path.join(TEMPLATES_DIR, 'course.html'), 'utf-8');
  const courseDir = path.join(DIST_DIR, 'courses', course.slug);
  await fs.mkdir(courseDir, { recursive: true });

  const lessonList = course.lessons.map(lesson => `
    <li class="lesson-item">
      <a href="${lesson.slug}.html">${lesson.title}</a>
      ${lesson.description ? `<p>${lesson.description}</p>` : ''}
      ${lesson.readingTime ? `<span class="reading-time">${lesson.readingTime}</span>` : ''}
    </li>
  `).join('\n');

  const lessonCountText = `${course.lessons.length} lesson${course.lessons.length !== 1 ? 's' : ''}`;
  const difficultyHtml = course.difficulty
    ? `<span class="difficulty-badge difficulty-${course.difficulty}">${course.difficulty}</span>`
    : '';
  const durationHtml = course.estimatedDuration
    ? `<span class="meta-item meta-duration">${course.estimatedDuration}</span>`
    : '';

  const html = template
    .replace(/\{\{COURSE_TITLE\}\}/g, course.title)
    .replace(/\{\{COURSE_DESCRIPTION\}\}/g, course.description)
    .replace(/\{\{COURSE_DIFFICULTY\}\}/g, difficultyHtml)
    .replace(/\{\{COURSE_DURATION\}\}/g, durationHtml)
    .replace(/\{\{LESSON_COUNT_TEXT\}\}/g, lessonCountText)
    .replace(/\{\{LESSON_LIST\}\}/g, lessonList);

  await fs.writeFile(path.join(courseDir, 'index.html'), html);
}

async function generateLessonPages(course) {
  const template = await fs.readFile(path.join(TEMPLATES_DIR, 'lesson.html'), 'utf-8');
  const courseDir = path.join(DIST_DIR, 'courses', course.slug);
  
  for (let i = 0; i < course.lessons.length; i++) {
    const lesson = course.lessons[i];
    const prevLesson = i > 0 ? course.lessons[i - 1] : null;
    const nextLesson = i < course.lessons.length - 1 ? course.lessons[i + 1] : null;
    
    const prevLink = prevLesson 
      ? `<a href="${prevLesson.slug}.html" class="nav-prev">← ${prevLesson.title}</a>`
      : '';
    const nextLink = nextLesson
      ? `<a href="${nextLesson.slug}.html" class="nav-next">${nextLesson.title} →</a>`
      : '';
    
    const html = template
      .replace(/\{\{COURSE_TITLE\}\}/g, course.title)
      .replace(/\{\{COURSE_SLUG\}\}/g, course.slug)
      .replace(/\{\{LESSON_TITLE\}\}/g, lesson.title)
      .replace(/\{\{LESSON_CONTENT\}\}/g, lesson.content)
      .replace(/\{\{PREV_LINK\}\}/g, prevLink)
      .replace(/\{\{NEXT_LINK\}\}/g, nextLink);
    
    await fs.writeFile(path.join(courseDir, `${lesson.slug}.html`), html);
  }
}

async function copyAssets() {
  const assetsDir = path.join('assets');
  const distAssetsDir = path.join(DIST_DIR, 'assets');
  
  await fs.mkdir(distAssetsDir, { recursive: true });
  
  if (await fileExists(assetsDir)) {
    await copyDir(assetsDir, distAssetsDir);
  }
}

async function copyDir(src, dest) {
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await fs.mkdir(destPath, { recursive: true });
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toUTCString().replace('GMT', '+0000');
}

function buildRssFeed(courses) {
  // One <item> per course, newest update first. Feed lives at /feed.xml
  // (linked from every page's <head> via rel="alternate" autodiscovery).
  const items = [...courses]
    .filter(c => c.lastUpdated)
    .sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated))
    .map(c => {
      const link = `${SITE_URL}/courses/${c.slug}/`;
      const lessonCount = `${c.lessons.length} lesson${c.lessons.length !== 1 ? 's' : ''}`;
      const description = [c.description, lessonCount, c.estimatedDuration]
        .filter(Boolean).join(' — ');
      const categories = (c.tags || [])
        .map(t => `    <category>${xmlEscape(t)}</category>`)
        .join('\n');
      return `  <item>
    <title>${xmlEscape(c.title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${toRfc2822(c.lastUpdated)}</pubDate>
${categories}
    <description>${xmlEscape(description)}</description>
  </item>`;
    })
    .join('\n');

  const lastBuild = toRfc2822(new Date().toISOString().slice(0, 10));

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>32N1 Learning Hub</title>
    <link>${SITE_URL}/</link>
    <description>New and updated courses from the 32N1 Learning Hub (learn.32n1.com)</description>
    <language>en</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
