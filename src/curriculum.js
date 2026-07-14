'use strict';

/**
 * Curriculum helpers — derive the module/lesson structure of a track straight
 * from the content graph, so adding content needs no changes here.
 *
 * A "track" is 'youth' or 'adult' (its menu node is `${track}.menu`). A module
 * is a menu the track menu links to; its lessons are the lesson nodes that
 * module menu links to, in menu order.
 */

function modulesForTrack(content, track) {
  const trackMenu = content.nodes[`${track}.menu`];
  if (!trackMenu) return [];
  const modules = [];
  for (const opt of trackMenu.options) {
    const node = content.nodes[opt.next];
    if (!node || node.type !== 'menu') continue; // skip quiz / back / specials
    const lessonIds = node.options
      .filter((o) => content.nodes[o.next] && content.nodes[o.next].type === 'lesson')
      .map((o) => o.next);
    if (lessonIds.length) {
      modules.push({ id: opt.next, label: stripNumber(opt.label), lessonIds });
    }
  }
  return modules;
}

function allLessonIds(content, track) {
  return modulesForTrack(content, track).flatMap((m) => m.lessonIds);
}

/** First lesson (in curriculum order) the user hasn't completed yet. */
function nextLesson(content, track, completedSet) {
  for (const m of modulesForTrack(content, track)) {
    for (const lessonId of m.lessonIds) {
      if (!completedSet.has(lessonId)) {
        return { lessonId, module: m, title: content.nodes[lessonId].title };
      }
    }
  }
  return null; // track fully complete
}

function trackProgress(content, track, completedSet) {
  const modules = modulesForTrack(content, track).map((m) => {
    const done = m.lessonIds.filter((id) => completedSet.has(id)).length;
    return { ...m, done, total: m.lessonIds.length, complete: done === m.lessonIds.length };
  });
  const total = modules.reduce((n, m) => n + m.total, 0);
  const done = modules.reduce((n, m) => n + m.done, 0);
  return {
    done,
    total,
    pct: total ? Math.round((done / total) * 100) : 0,
    modules,
    complete: total > 0 && done === total,
  };
}

function moduleOf(content, track, lessonId) {
  return modulesForTrack(content, track).find((m) => m.lessonIds.includes(lessonId)) || null;
}

/**
 * The lesson's display name as it appears in its module menu (which IS
 * translated in every language pack), falling back to the lesson node's own
 * `title` (English-only) if it isn't listed. Used for lesson-card headings.
 */
function lessonLabel(content, lessonId) {
  const track = lessonId.split('.')[0];
  const mod = moduleOf(content, track, lessonId);
  if (mod) {
    const menu = content.nodes[mod.id];
    const opt = menu && menu.options && menu.options.find((o) => o.next === lessonId);
    if (opt && opt.label) return stripNumber(opt.label);
  }
  const node = content.nodes[lessonId];
  return (node && node.title) || '';
}

/** Count how many distinct modules the user has touched (≥1 lesson done). */
function modulesTouched(content, track, completedSet) {
  return modulesForTrack(content, track).filter((m) =>
    m.lessonIds.some((id) => completedSet.has(id))
  ).length;
}

// "1️⃣ 🌐 Digital Foundations" → "Digital Foundations"
function stripNumber(label) {
  return label.replace(/^[0-9️⃣\s]+/u, '').replace(/^[\p{Emoji_Presentation}️\s]+/u, '').trim() || label;
}

module.exports = {
  modulesForTrack,
  allLessonIds,
  nextLesson,
  trackProgress,
  moduleOf,
  lessonLabel,
  modulesTouched,
};
