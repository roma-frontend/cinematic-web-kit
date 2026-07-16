import { describe, it, expect, beforeEach } from 'vitest';
import {
  createCourse, updateCourse, deleteCourse, listCoursesForAdmin,
  createLesson, listLessonsForAdmin, deleteLesson,
  listPublishedCourses, getCourseForMember, setLessonProgress, countPublishedCourses,
} from '@/lib/site-learning';
import { createUser } from '@/lib/auth';
import { createSite } from '@/lib/sites';
import { createSiteUser } from '@/lib/site-auth';
import { resetDb } from './helpers';

beforeEach(() => resetDb());

function seed() {
  createUser('super@example.com', 'password123', 'Super'); // first => superadmin
  const owner = createUser('owner@example.com', 'password123', 'Owner');
  const site = createSite(owner.id, 'Org');
  const member = createSiteUser(site.id, 'm@example.com', 'password123', 'Member', 'approved');
  return { owner, site, member };
}

describe('courses admin CRUD', () => {
  it('creates a course with an incrementing position and lists it with a lesson count', () => {
    const { owner, site } = seed();
    const c1 = createCourse(site.id, owner.id, { title: 'A' });
    const c2 = createCourse(site.id, owner.id, { title: 'B' });
    expect(c2.position).toBe(c1.position + 1);
    createLesson(site.id, c1.id, { title: 'L1' });
    const list = listCoursesForAdmin(site.id);
    expect(list).toHaveLength(2);
    expect(list.find((c) => c.id === c1.id)?.lessonCount).toBe(1);
  });

  it('scopes lessons to their course + site and deletes cascade', () => {
    const { owner, site } = seed();
    const c = createCourse(site.id, owner.id, { title: 'C' });
    createLesson(site.id, c.id, { title: 'L1' });
    createLesson(site.id, c.id, { title: 'L2' });
    expect(listLessonsForAdmin(site.id, c.id)).toHaveLength(2);
    deleteCourse(site.id, c.id);
    expect(listCoursesForAdmin(site.id)).toHaveLength(0);
    expect(listLessonsForAdmin(site.id, c.id)).toHaveLength(0);
  });

  it('rejects a lesson for a course from another site', () => {
    const { owner, site } = seed();
    const other = createSite(owner.id, 'Org2');
    const c = createCourse(site.id, owner.id, { title: 'C' });
    expect(createLesson(other.id, c.id, { title: 'X' })).toBeNull();
  });
});

describe('member read + progress', () => {
  it('hides draft courses from members but shows them to admin', () => {
    const { owner, site, member } = seed();
    createCourse(site.id, owner.id, { title: 'Draft', published: false });
    expect(countPublishedCourses(site.id)).toBe(0);
    expect(listPublishedCourses(site.id, member.id)).toHaveLength(0);
    expect(listCoursesForAdmin(site.id)).toHaveLength(1);
  });

  it('tracks per-member progress counts', () => {
    const { owner, site, member } = seed();
    const c = createCourse(site.id, owner.id, { title: 'C' });
    const l1 = createLesson(site.id, c.id, { title: 'L1' })!;
    createLesson(site.id, c.id, { title: 'L2' });

    let mine = listPublishedCourses(site.id, member.id);
    expect(mine[0].lessonCount).toBe(2);
    expect(mine[0].completedCount).toBe(0);

    expect(setLessonProgress(site.id, member.id, l1.id, true)).toBe(true);
    mine = listPublishedCourses(site.id, member.id);
    expect(mine[0].completedCount).toBe(1);

    const detail = getCourseForMember(site.id, member.id, c.id)!;
    expect(detail.lessons.find((l) => l.id === l1.id)?.completed).toBe(true);

    // Idempotent complete, then uncomplete.
    setLessonProgress(site.id, member.id, l1.id, true);
    expect(listPublishedCourses(site.id, member.id)[0].completedCount).toBe(1);
    setLessonProgress(site.id, member.id, l1.id, false);
    expect(listPublishedCourses(site.id, member.id)[0].completedCount).toBe(0);
  });

  it('refuses progress on a lesson from another site', () => {
    const { owner, site, member } = seed();
    const c = createCourse(site.id, owner.id, { title: 'C' });
    const l = createLesson(site.id, c.id, { title: 'L1' })!;
    const other = createSite(owner.id, 'Org2');
    expect(setLessonProgress(other.id, member.id, l.id, true)).toBe(false);
  });

  it('refuses progress on a lesson whose course is a draft', () => {
    const { owner, site, member } = seed();
    const c = createCourse(site.id, owner.id, { title: 'C', published: false });
    const l = createLesson(site.id, c.id, { title: 'L1' })!;
    expect(setLessonProgress(site.id, member.id, l.id, true)).toBe(false);
    updateCourse(site.id, c.id, { published: true });
    expect(setLessonProgress(site.id, member.id, l.id, true)).toBe(true);
  });
});
