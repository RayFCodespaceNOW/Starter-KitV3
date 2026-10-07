const timeline = document.querySelector("[data-mission-timeline]");

if (timeline) {
  const track = timeline.querySelector("[data-timeline-track]");
  const ship = timeline.querySelector("[data-timeline-ship]");
  const steps = [...track.querySelectorAll("[data-timeline-step]")];
  let progress = 0;
  let scheduledFrame = 0;

  const updateTimeline = () => {
    scheduledFrame = 0;
    const viewportCenter = window.innerHeight / 2;
    const centers = steps.map((step) => {
      const bounds = step.getBoundingClientRect();
      return bounds.top + bounds.height / 2;
    });

    progress = 0;
    for (let index = 0; index < centers.length - 1; index += 1) {
      if (viewportCenter >= centers[index + 1]) {
        progress = index + 1;
      } else if (viewportCenter > centers[index]) {
        const span = centers[index + 1] - centers[index];
        progress = index + (viewportCenter - centers[index]) / span;
        break;
      } else {
        break;
      }
    }

    progress = Math.max(0, Math.min(steps.length - 1, progress));
    const activeStep = Math.min(steps.length - 1, Math.floor(progress + 0.5));
    const travel = Math.max(0, track.clientHeight - ship.offsetHeight);
    ship.style.transform = `translate3d(-50%, ${progress / Math.max(1, steps.length - 1) * travel}px, 0) rotate(180deg)`;

    steps.forEach((step, index) => {
      const isActive = index === activeStep;
      step.classList.toggle("is-active", isActive);
      if (isActive) {
        step.setAttribute("aria-current", "step");
      } else {
        step.removeAttribute("aria-current");
      }
    });
  };

  const scheduleUpdate = () => {
    if (!scheduledFrame) {
      scheduledFrame = window.requestAnimationFrame(updateTimeline);
    }
  };

  const darkModeObserver = new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("is-space-sequence-active", entry.isIntersecting);
  }, { threshold: 0.12 });

  darkModeObserver.observe(timeline);
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  new ResizeObserver(scheduleUpdate).observe(track);
  updateTimeline();
}