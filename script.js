      const sessions = Array.from(
        document.querySelectorAll(".calendar .session"),
      );
      const lessonCards = Array.from(
        document.querySelectorAll(".lessons-detail .lesson-card"),
      );
      const dayHeaders = Array.from(
        document.querySelectorAll(".calendar .day-header"),
      );
      const drawer = document.getElementById("lesson-drawer");
      const drawerBackdrop = document.querySelector(".lesson-drawer-backdrop");
      const drawerContent = document.querySelector(".drawer-content");
      const drawerSummary = document.querySelector(".drawer-summary");
      const drawerKicker = document.querySelector(".drawer-kicker");
      const drawerCloseButton = document.querySelector(".drawer-close");
      const drawerHandle = document.querySelector(".drawer-handle");
      const drawerTopbar = document.querySelector(".drawer-topbar");
      const body = document.body;

      let activeSession = null;
      let lastTrigger = null;
      let hideDrawerTimeout = null;
      let dragPointerId = null;
      let dragStartY = 0;
      let currentDragOffset = 0;

      const SWIPE_CLOSE_THRESHOLD = 120;

      const lessonMap = new Map(
        lessonCards
          .map((card) => {
            const title =
              card.querySelector(".lesson-title")?.textContent || "";
            const match = title.match(/Lesson\s+(\d+)/i);
            return match ? [match[1], card] : null;
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

      function getLessonNumberFromSession(session) {
        const label = session.querySelector(".lesson-num")?.textContent || "";
        return label.match(/Lesson\s+(\d+)/i)?.[1] || null;
      }

      function buildSummaryItem(label, value) {
        return `
          <div class="drawer-summary-item">
            <span class="drawer-summary-label">${label}</span>
            <div class="drawer-summary-value">${value}</div>
          </div>
        `;
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

      function openLessonDrawer(session) {
        const lessonNumber = getLessonNumberFromSession(session);
        const sourceCard = lessonNumber ? lessonMap.get(lessonNumber) : null;

        if (!sourceCard) return;

        const phase = Array.from(session.classList)
          .find((className) => className.startsWith("phase-"))
          ?.replace("phase-", "");
        const dayMeta = dayMetaByPhase.get(phase || "") || {};
        const lessonTitle =
          session.querySelector(".title")?.textContent?.trim() || "Lesson";
        const teaser =
          session.querySelector(".duration")?.textContent?.trim() ||
          dayMeta.theme ||
          "Workshop session";
        const meta = sourceCard.querySelector(".lesson-meta")?.innerHTML || "";

        const clonedCard = sourceCard.cloneNode(true);
        const clonedTitle = clonedCard.querySelector(".lesson-title");
        if (clonedTitle) clonedTitle.id = "lesson-drawer-title";

        drawerContent.replaceChildren(clonedCard);
        drawerSummary.innerHTML = [
          buildSummaryItem("Lesson", `Lesson ${lessonNumber}`),
          buildSummaryItem(
            "Day",
            `${dayMeta.dayName || "Workshop"} · ${dayMeta.theme || "Session"}`,
          ),
          buildSummaryItem("Focus", teaser),
        ].join("");

        drawerKicker.textContent = `${dayMeta.dayLabel || "Workshop"} • ${lessonTitle}`;

        if (activeSession && activeSession !== session) {
          activeSession.classList.remove("active");
        }

        activeSession = session;
        lastTrigger = session;
        activeSession.classList.add("active");

        showDrawerShell();
        drawerCloseButton.focus({ preventScroll: true });
      }

      function closeLessonDrawer({ restoreFocus = true } = {}) {
        if (!body.classList.contains("drawer-open") && drawer.hidden) return;

        if (activeSession) {
          activeSession.classList.remove("active");
        }

        hideDrawerShell();

        if (restoreFocus && lastTrigger) {
          lastTrigger.focus({ preventScroll: true });
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
          closeLessonDrawer({ restoreFocus: false });
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
        const title =
          session.querySelector(".title")?.textContent?.trim() || "Lesson";
        const phase = Array.from(session.classList)
          .find((className) => className.startsWith("phase-"))
          ?.replace("phase-", "");
        const dayMeta = dayMetaByPhase.get(phase || "") || {};

        session.tabIndex = 0;
        session.setAttribute("role", "button");
        session.setAttribute("aria-haspopup", "dialog");
        session.setAttribute("aria-controls", "lesson-drawer");
        session.setAttribute(
          "aria-label",
          `${dayMeta.dayName || "Workshop"}, Lesson ${lessonNumber || ""}: ${title}`,
        );

        session.addEventListener("click", () => openLessonDrawer(session));
        session.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLessonDrawer(session);
          }
        });
      });

      drawerBackdrop.addEventListener("click", closeLessonDrawer);
      drawerCloseButton.addEventListener("click", closeLessonDrawer);

      window.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeLessonDrawer();
        }
      });
