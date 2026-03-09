const sessions = Array.from(document.querySelectorAll(".calendar .session"));
const lessonCards = Array.from(
  document.querySelectorAll(".lessons-detail .lesson-card"),
);
const dayHeaders = Array.from(document.querySelectorAll(".calendar .day-header"));
const drawer = document.getElementById("lesson-drawer");
const drawerBackdrop = document.querySelector(".lesson-drawer-backdrop");
const drawerContent = document.querySelector(".drawer-content");
const drawerSummary = document.querySelector(".drawer-summary");
const drawerKicker = document.querySelector(".drawer-kicker");
const drawerCloseButton = document.querySelector(".drawer-close");
const drawerHandle = document.querySelector(".drawer-handle");
const drawerTopbar = document.querySelector(".drawer-topbar");
const desktopLessonPage = document.getElementById("desktop-lesson-page");
const desktopLessonBackButton = document.querySelector(".lesson-page-back");
const desktopLessonKicker = document.querySelector(".lesson-page-kicker");
const desktopLessonEyebrow = document.querySelector(".lesson-page-eyebrow");
const desktopLessonTitle = document.querySelector(".lesson-page-title");
const desktopLessonSubtitle = document.querySelector(".lesson-page-subtitle");
const desktopLessonSummary = document.querySelector(".lesson-page-summary");
const desktopLessonContent = document.querySelector(".lesson-page-content");
const body = document.body;

let activeSession = null;
let activeLessonNumber = null;
let lastTrigger = null;
let hideDrawerTimeout = null;
let hideDesktopLessonTimeout = null;
let dragPointerId = null;
let dragStartY = 0;
let currentDragOffset = 0;

const SWIPE_CLOSE_THRESHOLD = 120;
const SHELL_HIDE_DURATION = 580;
const DESKTOP_MEDIA_QUERY = window.matchMedia("(min-width: 769px)");

const lessonMap = new Map(
  lessonCards
    .map((card) => {
      const title = card.querySelector(".lesson-title")?.textContent || "";
      const match = title.match(/Lesson\s+(\d+)/i);
      return match ? [match[1], card] : null;
    })
    .filter(Boolean),
);

const sessionMap = new Map(
  sessions
    .map((session) => {
      const lessonNumber = getLessonNumberFromSession(session);
      return lessonNumber ? [lessonNumber, session] : null;
    })
    .filter(Boolean),
);

const dayMetaByPhase = new Map(
  dayHeaders.map((header, index) => {
    const parts = header.textContent
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean);

    return [
      String(index + 1),
      {
        dayName: parts[0] || `Day ${index + 1}`,
        dayLabel: parts[1] || `Day ${index + 1}`,
        theme: parts[2] || "Hands-on workshop",
      },
    ];
  }),
);

function isDesktopView() {
  return DESKTOP_MEDIA_QUERY.matches;
}

function getLessonNumberFromSession(session) {
  const label = session.querySelector(".lesson-num")?.textContent || "";
  return label.match(/Lesson\s+(\d+)/i)?.[1] || null;
}

function getPhaseFromSession(session) {
  return Array.from(session.classList)
    .find((className) => className.startsWith("phase-"))
    ?.replace("phase-", "");
}

function buildSummaryItem(label, value) {
  return `
    <div class="drawer-summary-item">
      <span class="drawer-summary-label">${label}</span>
      <div class="drawer-summary-value">${value}</div>
    </div>
  `;
}

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function getUrlLessonNumber() {
  const lessonNumber = new URL(window.location.href).searchParams.get("lesson");
  return lessonNumber && /^\d+$/.test(lessonNumber) ? lessonNumber : null;
}

function updateUrlLesson(lessonNumber, { replace = false } = {}) {
  const url = new URL(window.location.href);
  const currentLesson = url.searchParams.get("lesson");
  const nextLesson = lessonNumber ? String(lessonNumber) : null;

  if (nextLesson) {
    url.searchParams.set("lesson", nextLesson);
  } else {
    url.searchParams.delete("lesson");
  }

  if (currentLesson === nextLesson) return;

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({ lesson: nextLesson }, "", url);
}

function setDrawerOffset(offset) {
  currentDragOffset = Math.max(0, offset);
  drawer.style.setProperty("--drawer-offset", `${currentDragOffset}px`);
}

function resetDrawerDrag() {
  dragPointerId = null;
  dragStartY = 0;
  currentDragOffset = 0;
  drawer.classList.remove("dragging");
  drawer.style.setProperty("--drawer-offset", "0px");
  drawerBackdrop.style.removeProperty("opacity");
}

function updateBackdropForDrag(offset) {
  const progress = Math.min(offset / 240, 1);
  drawerBackdrop.style.opacity = String(1 - progress * 0.55);
}

function showDrawerShell() {
  clearTimeout(hideDrawerTimeout);
  resetDrawerDrag();
  drawer.hidden = false;
  drawerBackdrop.hidden = false;
  drawer.setAttribute("aria-hidden", "false");

  requestAnimationFrame(() => {
    body.classList.add("drawer-open");
  });
}

function hideDrawerShell() {
  const wasOpen = body.classList.contains("drawer-open") || !drawer.hidden;
  if (!wasOpen) return;

  body.classList.remove("drawer-open");
  drawer.setAttribute("aria-hidden", "true");
  resetDrawerDrag();

  hideDrawerTimeout = window.setTimeout(() => {
    if (!body.classList.contains("drawer-open")) {
      drawer.hidden = true;
      drawerBackdrop.hidden = true;
    }
  }, 360);
}

function showDesktopLessonShell({ scroll = false } = {}) {
  clearTimeout(hideDesktopLessonTimeout);
  desktopLessonPage.hidden = false;

  requestAnimationFrame(() => {
    body.classList.add("desktop-lesson-open");

    if (scroll) {
      desktopLessonPage.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
}

function hideDesktopLessonShell({ restoreFocus = false } = {}) {
  const wasOpen =
    body.classList.contains("desktop-lesson-open") || !desktopLessonPage.hidden;
  if (!wasOpen) return;

  body.classList.remove("desktop-lesson-open");

  hideDesktopLessonTimeout = window.setTimeout(() => {
    if (!body.classList.contains("desktop-lesson-open")) {
      desktopLessonPage.hidden = true;
    }
  }, SHELL_HIDE_DURATION);

  if (restoreFocus && lastTrigger) {
    lastTrigger.focus({ preventScroll: true });
  }
}

function clearActiveSession() {
  if (!activeSession) return;

  activeSession.classList.remove("active");
  activeSession.removeAttribute("aria-current");
  activeSession = null;
  activeLessonNumber = null;
}

function setActiveSession(session, { rememberTrigger = false } = {}) {
  if (activeSession && activeSession !== session) {
    activeSession.classList.remove("active");
    activeSession.removeAttribute("aria-current");
  }

  activeSession = session;
  activeLessonNumber = getLessonNumberFromSession(session);
  activeSession.classList.add("active");
  activeSession.setAttribute("aria-current", "page");

  if (rememberTrigger) {
    lastTrigger = session;
  }
}

function getRgbChannels(colorValue) {
  const channels = colorValue.match(/[\d.]+/g);
  return channels ? channels.slice(0, 3).join(", ") : "103, 109, 127";
}

function applyLessonTheme(target, accentColor) {
  if (!target) return;

  target.style.setProperty("--active-accent", accentColor);
  target.style.setProperty("--lesson-accent", accentColor);
  target.style.setProperty("--lesson-accent-rgb", getRgbChannels(accentColor));
}

function getLessonData(lessonNumber) {
  const normalizedLessonNumber = String(lessonNumber);
  const session = sessionMap.get(normalizedLessonNumber);
  const sourceCard = lessonMap.get(normalizedLessonNumber);

  if (!session || !sourceCard) return null;

  const phase = getPhaseFromSession(session);
  const dayMeta = dayMetaByPhase.get(phase || "") || {};
  const sessionTitle =
    session.querySelector(".title")?.textContent?.trim() || "Lesson";
  const fullLessonTitle =
    sourceCard.querySelector(".lesson-title")?.textContent?.trim() ||
    `Lesson ${normalizedLessonNumber}: ${sessionTitle}`;
  const teaser =
    session.querySelector(".duration")?.textContent?.trim() ||
    dayMeta.theme ||
    "Workshop session";
  const metaHtml = sourceCard.querySelector(".lesson-meta")?.innerHTML || "";
  const metaText = normalizeText(
    sourceCard.querySelector(".lesson-meta")?.textContent || "",
  );
  const accentColor =
    getComputedStyle(session.querySelector(".lesson-num") || session)
      .borderBottomColor || "rgb(103, 109, 127)";

  return {
    lessonNumber: normalizedLessonNumber,
    session,
    sourceCard,
    dayMeta,
    sessionTitle,
    fullLessonTitle,
    teaser,
    metaHtml,
    metaText,
    accentColor,
  };
}

function renderDrawerLesson(data) {
  const clonedCard = data.sourceCard.cloneNode(true);
  const clonedTitle = clonedCard.querySelector(".lesson-title");
  if (clonedTitle) clonedTitle.id = "lesson-drawer-title";

  applyLessonTheme(drawer, data.accentColor);
  drawerContent.replaceChildren(clonedCard);
  drawerSummary.innerHTML = [
    buildSummaryItem("Lesson", `Lesson ${data.lessonNumber}`),
    buildSummaryItem(
      "Day",
      `${data.dayMeta.dayName || "Workshop"} · ${data.dayMeta.theme || "Session"}`,
    ),
    buildSummaryItem("Focus", data.teaser),
  ].join("");

  drawerKicker.textContent = `${data.dayMeta.dayLabel || "Workshop"} • ${data.sessionTitle}`;
}

function renderDesktopLesson(data) {
  const clonedCard = data.sourceCard.cloneNode(true);

  applyLessonTheme(desktopLessonPage, data.accentColor);
  desktopLessonKicker.textContent = data.fullLessonTitle;
  desktopLessonEyebrow.textContent = `${data.dayMeta.dayLabel || "Workshop"} · ${data.dayMeta.theme || "Hands-on workshop"}`;
  desktopLessonTitle.textContent = data.fullLessonTitle;

  const subtitleParts = [data.metaText, data.teaser].filter(
    (part, index, parts) => part && parts.indexOf(part) === index,
  );
  desktopLessonSubtitle.textContent = subtitleParts.join(" · ");

  desktopLessonSummary.innerHTML = [
    buildSummaryItem("Lesson", `Lesson ${data.lessonNumber}`),
    buildSummaryItem("Schedule", data.metaHtml || data.metaText || "Workshop"),
    buildSummaryItem("Focus", data.teaser),
  ].join("");

  desktopLessonContent.replaceChildren(clonedCard);
}

function openLessonByNumber(
  lessonNumber,
  { updateUrl = true, replaceUrl = false, scroll = true, rememberTrigger = false } = {},
) {
  const data = getLessonData(lessonNumber);

  if (!data) {
    closeLesson({ updateUrl: false, restoreFocus: false });
    if (updateUrl) updateUrlLesson(null, { replace: true });
    return false;
  }

  setActiveSession(data.session, { rememberTrigger });

  if (isDesktopView()) {
    hideDrawerShell();
    renderDesktopLesson(data);
    showDesktopLessonShell({ scroll });
  } else {
    hideDesktopLessonShell({ restoreFocus: false });
    renderDrawerLesson(data);
    showDrawerShell();
    drawerCloseButton.focus({ preventScroll: true });
  }

  if (updateUrl) {
    updateUrlLesson(data.lessonNumber, { replace: replaceUrl });
  }

  return true;
}

function closeLesson(
  { updateUrl = true, replaceUrl = false, restoreFocus = true } = {},
) {
  const shouldRestoreFocus = restoreFocus && Boolean(lastTrigger);

  clearActiveSession();
  hideDrawerShell();
  hideDesktopLessonShell({ restoreFocus: shouldRestoreFocus });

  if (updateUrl) {
    updateUrlLesson(null, { replace: replaceUrl });
  }
}

function syncSessionAccessibility() {
  sessions.forEach((session) => {
    if (isDesktopView()) {
      session.removeAttribute("aria-haspopup");
      session.removeAttribute("aria-controls");
      return;
    }

    session.setAttribute("aria-haspopup", "dialog");
    session.setAttribute("aria-controls", "lesson-drawer");
  });
}

function syncLessonStateWithUrl({ scroll = false } = {}) {
  const lessonNumber = getUrlLessonNumber();

  if (!lessonNumber) {
    closeLesson({ updateUrl: false, restoreFocus: false });
    return;
  }

  const didOpen = openLessonByNumber(lessonNumber, {
    updateUrl: false,
    scroll,
    rememberTrigger: false,
  });

  if (!didOpen) {
    updateUrlLesson(null, { replace: true });
  }
}

function handleDrawerDragStart(event) {
  if (!body.classList.contains("drawer-open")) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  dragPointerId = event.pointerId;
  dragStartY = event.clientY;
  drawer.classList.add("dragging");

  try {
    event.currentTarget.setPointerCapture?.(event.pointerId);
  } catch (error) {
    // Ignore synthetic-event pointer capture failures.
  }

  event.preventDefault();
}

function handleDrawerDragMove(event) {
  if (dragPointerId !== event.pointerId) return;

  const offset = Math.max(0, event.clientY - dragStartY);
  setDrawerOffset(offset);
  updateBackdropForDrag(offset);
}

function handleDrawerDragEnd(event) {
  if (dragPointerId !== event.pointerId) return;

  const shouldClose = currentDragOffset >= SWIPE_CLOSE_THRESHOLD;

  try {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  } catch (error) {
    // Ignore synthetic-event pointer capture failures.
  }

  if (shouldClose) {
    closeLesson({ restoreFocus: false });
    return;
  }

  drawer.classList.remove("dragging");
  setDrawerOffset(0);
  drawerBackdrop.style.removeProperty("opacity");
  dragPointerId = null;
  dragStartY = 0;
}

[drawerHandle, drawerTopbar].forEach((dragZone) => {
  dragZone.addEventListener("pointerdown", handleDrawerDragStart);
  dragZone.addEventListener("pointermove", handleDrawerDragMove);
  dragZone.addEventListener("pointerup", handleDrawerDragEnd);
  dragZone.addEventListener("pointercancel", handleDrawerDragEnd);
});

sessions.forEach((session) => {
  const lessonNumber = getLessonNumberFromSession(session);
  const title = session.querySelector(".title")?.textContent?.trim() || "Lesson";
  const phase = getPhaseFromSession(session);
  const dayMeta = dayMetaByPhase.get(phase || "") || {};

  session.tabIndex = 0;
  session.setAttribute("role", "button");
  session.setAttribute(
    "aria-label",
    `${dayMeta.dayName || "Workshop"}, Lesson ${lessonNumber || ""}: ${title}`,
  );

  session.addEventListener("click", () => {
    if (!lessonNumber) return;
    openLessonByNumber(lessonNumber, { rememberTrigger: true, scroll: true });
  });

  session.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && lessonNumber) {
      event.preventDefault();
      openLessonByNumber(lessonNumber, {
        rememberTrigger: true,
        scroll: true,
      });
    }
  });
});

drawerBackdrop.addEventListener("click", () => closeLesson());
drawerCloseButton.addEventListener("click", () => closeLesson());
desktopLessonBackButton.addEventListener("click", () => closeLesson());

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && (activeLessonNumber || getUrlLessonNumber())) {
    closeLesson();
  }
});

window.addEventListener("popstate", () => {
  syncLessonStateWithUrl({ scroll: false });
});

DESKTOP_MEDIA_QUERY.addEventListener("change", () => {
  syncSessionAccessibility();
  syncLessonStateWithUrl({ scroll: false });
});

syncSessionAccessibility();
syncLessonStateWithUrl({ scroll: false });
