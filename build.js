import fs from 'fs/promises';
import path from 'path';

const CONTENT_DIR = 'content';
const DIST_DIR = 'dist';
const TEMPLATES_DIR = 'templates';

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
  
  console.log('Build complete!');
}

async function readCourses() {
  const coursesDir = path.join(CONTENT_DIR, 'courses');
  const courseDirs = await fs.readdir(coursesDir);
  
  const courses = [];
  for (const dir of courseDirs) {
    const coursePath = path.join(coursesDir, dir);
    const stat = await fs.stat(coursePath);
    
    if (stat.isDirectory()) {
      const metadataPath = path.join(coursePath, 'metadata.json');
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
      
      // Read lessons
      const lessonsDir = path.join(coursePath, 'lessons');
      const lessonFiles = await fs.readdir(lessonsDir);
      const lessons = [];
      
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

async function generateHomePage(courses) {
  const template = await fs.readFile(path.join(TEMPLATES_DIR, 'home.html'), 'utf-8');
  
  const courseCards = courses.map(course => `
    <article class="course-card">
      <h2><a href="/courses/${course.slug}/index.html">${course.title}</a></h2>
      <p>${course.description}</p>
      <div class="course-meta">
        <span>${course.lessons.length} lesson${course.lessons.length !== 1 ? 's' : ''}</span>
        ${course.tags ? `<span class="tags">${course.tags.map(t => `<span class="tag">${t}</span>`).join('')}</span>` : ''}
      </div>
    </article>
  `).join('\n');
  
  const html = template.replace('{{COURSE_CARDS}}', courseCards);
  
  await fs.writeFile(path.join(DIST_DIR, 'index.html'), html);
}

async function generateCoursePage(course) {
  const template = await fs.readFile(path.join(TEMPLATES_DIR, 'course.html'), 'utf-8');
  const courseDir = path.join(DIST_DIR, 'courses', course.slug);
  await fs.mkdir(courseDir, { recursive: true });
  
  const lessonList = course.lessons.map((lesson, index) => `
    <li class="lesson-item">
      <a href="${lesson.slug}.html">${lesson.title}</a>
      ${lesson.description ? `<p>${lesson.description}</p>` : ''}
    </li>
  `).join('\n');
  
  const lessonCountText = `${course.lessons.length} lesson${course.lessons.length !== 1 ? 's' : ''}`;
  
  const html = template
    .replace(/\{\{COURSE_TITLE\}\}/g, course.title)
    .replace(/\{\{COURSE_DESCRIPTION\}\}/g, course.description)
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

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
