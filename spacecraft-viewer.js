import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const explorer = document.querySelector("[data-spacecraft-explorer]");

if (explorer) {
  const viewer = explorer.querySelector("[data-spacecraft-viewer]");
  const canvas = viewer.querySelector("[data-spacecraft-canvas]");
  const status = viewer.querySelector("[data-viewer-status]");
  const title = viewer.querySelector("[data-viewer-title]");
  const description = viewer.querySelector("[data-viewer-description]");
  const indexLabel = viewer.querySelector("[data-viewer-index]");
  const hotspots = [...viewer.querySelectorAll("[data-model-hotspot]")];
  const interiorPanel = viewer.querySelector("[data-capsule-interior]");
  const closeInterior = viewer.querySelector("[data-close-capsule]");
  const steps = [...explorer.querySelectorAll("[data-spacecraft-step]")];
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const focusNames = {
    human: "TestSpaceman",
    solar: "Scaffold1",
    capsule: "FinalTexture"
  };
  const viewAngles = [-0.18, -0.38, 0.3, 0.18];
  let renderer;
  let camera;
  let modelScene;
  let modelRadius = 0;
  let progress = 0;
  let scheduledFrame = 0;
  let views = [];
  let anchors = new Map();
  let interiorDismissed = false;

  const getStepBounds = () => steps.map((step) => {
    const bounds = step.getBoundingClientRect();
    return bounds.top + bounds.height / 2;
  });

  const getTargetView = (step) => {
    const name = focusNames[step.dataset.focus];
    let object;
    if (name) {
      modelScene.traverse((candidate) => {
        if (!object && candidate.name.includes(name)) {
          object = candidate;
        }
      });
    }
    if (!object) {
      return { target: new THREE.Vector3(), radius: modelRadius };
    }

    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const target = bounds.getCenter(new THREE.Vector3());
    let radius = Math.max(size.length() / 2, modelRadius * 0.14);
    if (step.dataset.focus === "capsule") {
      target.x = bounds.max.x - size.x * 0.035;
      radius = Math.max(Math.min(size.y, size.z) * 0.8, modelRadius * 0.12);
    }
    return {
      target,
      radius
    };
  };

  const updateHotspots = () => {
    const width = viewer.clientWidth;
    const height = viewer.clientHeight;
    hotspots.forEach((hotspot) => {
      const anchor = anchors.get(hotspot.dataset.modelHotspot);
      if (!anchor) {
        hotspot.hidden = true;
        return;
      }

      const projected = anchor.clone().project(camera);
      const visible = projected.z > -1 && projected.z < 1
        && Math.abs(projected.x) < .92 && Math.abs(projected.y) < .92;
      hotspot.hidden = !visible;
      if (visible) {
        hotspot.style.left = `${(projected.x * .5 + .5) * width}px`;
        hotspot.style.top = `${(-projected.y * .5 + .5) * height}px`;
      }
    });
  };

  const fitDistance = (radius) => {
    const verticalHalfFov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect);
    const fitHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
    return radius / Math.sin(fitHalfFov) * 1.35;
  };

  const setActiveStep = (index) => {
    const step = steps[index];
    steps.forEach((item, itemIndex) => {
      const isActive = itemIndex === index;
      item.classList.toggle("is-active", isActive);
      if (isActive) {
        item.setAttribute("aria-current", "step");
      } else {
        item.removeAttribute("aria-current");
      }
    });

    indexLabel.textContent = `${String(index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    title.textContent = step.dataset.title;
    description.textContent = step.dataset.description;
    if (step.dataset.focus !== "capsule") {
      interiorDismissed = false;
    }
    interiorPanel.hidden = step.dataset.focus !== "capsule" || interiorDismissed;
  };

  const renderFocus = () => {
    if (!renderer || !camera || views.length !== steps.length) {
      return;
    }

    const segment = Math.min(Math.floor(progress), views.length - 2);
    const segmentProgress = Math.max(0, Math.min(1, progress - segment));
    const amount = prefersReducedMotion.matches
      ? Number(segmentProgress >= 0.5)
      : segmentProgress * segmentProgress * (3 - 2 * segmentProgress);
    const start = views[segment];
    const end = views[segment + 1];
    const target = start.target.clone().lerp(end.target, amount);
    const distance = THREE.MathUtils.lerp(start.distance, end.distance, amount);
    const yaw = THREE.MathUtils.lerp(start.yaw, end.yaw, amount);
    const pitch = THREE.MathUtils.lerp(start.pitch, end.pitch, amount);
    const direction = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    );

    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    updateHotspots();
    renderer.render(modelScene, camera);
  };

  const updateSequence = () => {
    scheduledFrame = 0;
    const centers = getStepBounds();
    const viewportCenter = window.innerHeight / 2;

    progress = 0;
    for (let stepIndex = 0; stepIndex < centers.length - 1; stepIndex += 1) {
      if (viewportCenter >= centers[stepIndex + 1]) {
        progress = stepIndex + 1;
      } else if (viewportCenter > centers[stepIndex]) {
        const span = centers[stepIndex + 1] - centers[stepIndex];
        progress = stepIndex + (viewportCenter - centers[stepIndex]) / span;
        break;
      } else {
        break;
      }
    }

    progress = Math.max(0, Math.min(steps.length - 1, progress));
    setActiveStep(Math.min(steps.length - 1, Math.floor(progress + 0.5)));
    renderFocus();
  };

  const scheduleUpdate = () => {
    if (!scheduledFrame) {
      scheduledFrame = window.requestAnimationFrame(updateSequence);
    }
  };

  const resizeRenderer = () => {
    if (!renderer || !camera) {
      return;
    }

    const bounds = viewer.getBoundingClientRect();
    renderer.setSize(bounds.width, bounds.height, false);
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    views = steps.map((step) => {
      const focus = getTargetView(step);
      return {
        target: focus.target,
        distance: fitDistance(focus.radius),
        yaw: viewAngles[steps.indexOf(step)],
        pitch: steps.indexOf(step) === 1 ? 0.08 : 0.2
      };
    });
    renderFocus();
  };

  const loadSpacecraft = async () => {
    try {
      const response = await fetch("/explorative_space_craft.glb", { method: "HEAD" });
      if (!response.ok) {
        status.textContent = "Spacecraft model is unavailable";
        return;
      }

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      modelScene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
      modelScene.add(new THREE.HemisphereLight(0xfffaf4, 0x59423a, 2.2));
      const keyLight = new THREE.DirectionalLight(0xffead9, 3.2);
      keyLight.position.set(-3, 4, 5);
      modelScene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffdfc4, 1.3);
      fillLight.position.set(4, 1, -3);
      modelScene.add(fillLight);

      new GLTFLoader().load("/explorative_space_craft.glb", (gltf) => {
        const bounds = new THREE.Box3().setFromObject(gltf.scene);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z);
        if (!largestDimension) {
          status.textContent = "Spacecraft model has no visible geometry";
          return;
        }

        const scale = 4.4 / largestDimension;
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.sub(center.multiplyScalar(scale));
        modelRadius = size.length() * scale / 2;
        modelScene.add(gltf.scene);
        modelScene.updateMatrixWorld(true);
        anchors = new Map(steps
          .filter((step) => focusNames[step.dataset.focus])
          .map((step) => [step.dataset.focus, getTargetView(step).target]));
        status.hidden = true;
        resizeRenderer();
        updateSequence();
      }, undefined, () => {
        status.textContent = "Spacecraft model could not be loaded";
      });
    } catch {
      status.textContent = "3D preview is unavailable";
    }
  };

  const darkModeObserver = new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("is-space-sequence-active", entry.isIntersecting);
  }, { threshold: 0.12 });

  darkModeObserver.observe(explorer);
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  prefersReducedMotion.addEventListener("change", scheduleUpdate);
  new ResizeObserver(resizeRenderer).observe(viewer);
  hotspots.forEach((hotspot) => {
    hotspot.addEventListener("click", () => {
      const step = steps[Number(hotspot.dataset.stepTarget)];
      if (!step) {
        return;
      }
      interiorDismissed = false;
      step.scrollIntoView({ behavior: prefersReducedMotion.matches ? "auto" : "smooth", block: "center" });
    });
  });
  closeInterior.addEventListener("click", () => {
    interiorDismissed = true;
    interiorPanel.hidden = true;
  });
  setActiveStep(0);
  updateSequence();
  loadSpacecraft();
}
