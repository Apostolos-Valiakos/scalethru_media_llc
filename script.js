/* ==================================================================
   SCALETHRU MEDIA LLC — Site interactions (vanilla JS, no build step)
   ------------------------------------------------------------------
   Modules:
     1. Header           – glass background once scrolled
     2. Mobile menu      – hamburger toggle, Escape / link close
     3. Scroll-spy       – highlight the nav link of the visible section
     4. Scroll reveals   – IntersectionObserver-driven entrance animations
     5. Counters         – animated statistic counters
     6. Card spotlight   – cursor-following glow on interactive cards
     7. Hero particles   – interactive canvas particle network
     8. Contact form     – validation, loading state, mailto hand-off
     9. Service prefill  – cards pre-select the form's service field
    10. Case dialog      – full case study detail view
    11. Mobile CTA       – sticky bottom bar on small screens

   Icons are an inline SVG sprite in index.html (no icon library needed).
   ================================================================== */

(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Phones, touch devices, and data-saver users get a lighter particle field
  const lowPower =
    window.matchMedia("(max-width: 900px), (pointer: coarse)").matches ||
    Boolean(navigator.connection && navigator.connection.saveData);
  const CONTACT_EMAIL = "hello@scalethrumedia.com";

  // Labels for the form's "Service of Interest" values (used in the email body)
  const SERVICE_LABELS = {
    "not-sure": "Not sure yet: recommend a plan",
    "paid-ads": "Paid Advertising & Performance Marketing",
    "social-lifecycle": "Social Media & Lifecycle Marketing",
    "creative-web": "Creative Production & Web Development",
    "growth-strategy": "Growth Strategy & Business Consulting",
  };

  /* ----------------------------------------------------------------
     1. HEADER — add .is-scrolled after the first few pixels
     ---------------------------------------------------------------- */
  function initHeader() {
    const header = document.getElementById("siteHeader");
    if (!header) return;

    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ----------------------------------------------------------------
     2. MOBILE MENU
     ---------------------------------------------------------------- */
  function initMobileMenu() {
    const toggle = document.getElementById("menuToggle");
    const nav = document.getElementById("mainNav");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.classList.toggle("menu-open", open);
    };

    toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

    // Close when any link inside the menu is chosen
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset if the viewport grows past the mobile breakpoint
    window.matchMedia("(min-width: 901px)").addEventListener("change", (e) => {
      if (e.matches) setOpen(false);
    });
  }

  /* ----------------------------------------------------------------
     3. SCROLL-SPY
     A thin horizontal band across the middle of the viewport decides
     which section is "active".
     ---------------------------------------------------------------- */
  function initScrollSpy() {
    const links = document.querySelectorAll(".nav-link[data-spy]");
    if (!links.length || !("IntersectionObserver" in window)) return;

    const linkFor = new Map();
    links.forEach((link) => linkFor.set(link.dataset.spy, link));

    const setActive = (id) => {
      links.forEach((link) => {
        const active = link.dataset.spy === id;
        link.classList.toggle("is-active", active);
        if (active) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          // data-spy-parent lets a sub-section (e.g. #process) highlight its parent link;
          // the hero (or any unlisted section) clears the highlight
          const id = entry.target.dataset.spyParent || entry.target.id;
          setActive(linkFor.has(id) ? id : null);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    document.querySelectorAll("main section[id]").forEach((section) => observer.observe(section));
  }

  /* ----------------------------------------------------------------
     4. SCROLL REVEALS
     Elements declare their style via data-reveal="up|left|right|scale|
     skew|rotate" and an optional data-delay (ms).
     ---------------------------------------------------------------- */
  function initReveals() {
    // The process timeline's connector line draws itself when the steps scroll in
    const processSteps = document.querySelector(".process-steps");
    if (processSteps) {
      if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        processSteps.classList.add("is-drawn");
      } else {
        new IntersectionObserver((entries, obs) => {
          if (!entries[0].isIntersecting) return;
          processSteps.classList.add("is-drawn");
          obs.disconnect();
        }, { threshold: 0.4 }).observe(processSteps);
      }
    }

    const items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    // After the entrance finishes, drop [data-reveal] so hover transforms work
    const finish = (el, delay) => {
      window.setTimeout(() => el.removeAttribute("data-reveal"), delay + 1000);
    };

    const reveal = (el) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.classList.add("is-visible");
      finish(el, delay);
    };

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach((el) => {
        el.classList.add("is-visible");
        el.removeAttribute("data-reveal");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* ----------------------------------------------------------------
     5. COUNTERS
     <span class="counter" data-target="4.2" data-decimals="1"
           data-prefix="$" data-suffix="x">
     ---------------------------------------------------------------- */
  function initCounters() {
    const counters = document.querySelectorAll(".counter[data-target]");
    if (!counters.length) return;

    const DURATION = 2200;
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const format = (el, value) => {
      const decimals = parseInt(el.dataset.decimals || "0", 10);
      const num = value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
      return `${el.dataset.prefix || ""}${num}${el.dataset.suffix || ""}`;
    };

    const run = (el) => {
      const target = parseFloat(el.dataset.target);
      if (Number.isNaN(target)) return;

      if (prefersReducedMotion) {
        el.textContent = format(el, target);
        return;
      }

      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / DURATION, 1);
        el.textContent = format(el, target * easeOutExpo(progress));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /* ----------------------------------------------------------------
     6. CARD SPOTLIGHT — feeds cursor position into CSS vars --mx/--my
     ---------------------------------------------------------------- */
  function initCardSpotlight() {
    if (!window.matchMedia("(hover: hover)").matches) return;

    document.querySelectorAll(".interactive-card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        card.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ----------------------------------------------------------------
     7. HERO PARTICLES
     A lightweight particle network: particles drift, link to nearby
     neighbours, react to the cursor (repel + connect), and burst
     outward on click. Pauses when the hero is off-screen or the tab
     is hidden.
     ---------------------------------------------------------------- */
  function initParticles() {
    const canvas = document.getElementById("heroCanvas");
    const hero = document.getElementById("home");
    if (!canvas || !hero || !canvas.getContext) return;

    const ctx = canvas.getContext("2d");
    const COLORS = ["0, 240, 255", "56, 189, 248", "129, 140, 248"]; // cyan, sky blue, soft periwinkle (RGB)
    const LINK_DIST = lowPower ? 110 : 130;
    const MOUSE_RADIUS = 160;
    // Low-power devices: fewer particles, no glow blur, lower resolution, 30fps
    const MAX_PARTICLES = lowPower ? 40 : 130;
    const AREA_PER_PARTICLE = lowPower ? 14000 : 11000;
    const MAX_DPR = lowPower ? 1.5 : 2;
    const FRAME_INTERVAL = lowPower ? 1000 / 30 : 0;

    let width = 0;
    let height = 0;
    let particles = [];
    let rafId = null;
    let heroVisible = true;
    const mouse = { x: -9999, y: -9999, active: false };

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.r = Math.random() * 1.8 + 0.8;
        // Mostly cyan, some sky blue, a few soft periwinkle
        const roll = Math.random();
        this.color = roll < 0.6 ? COLORS[0] : roll < 0.9 ? COLORS[1] : COLORS[2];
      }

      update() {
        // Cursor repulsion
        if (mouse.active) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
            this.vx += (dx / dist) * force * 0.35;
            this.vy += (dy / dist) * force * 0.35;
          }
        }

        // Friction pulls speed back toward a gentle drift
        this.vx *= 0.97;
        this.vy *= 0.97;
        if (Math.abs(this.vx) < 0.12) this.vx += (Math.random() - 0.5) * 0.05;
        if (Math.abs(this.vy) < 0.12) this.vy += (Math.random() - 0.5) * 0.05;

        this.x += this.vx;
        this.y += this.vy;

        // Wrap around the edges
        if (this.x < -10) this.x = width + 10;
        else if (this.x > width + 10) this.x = -10;
        if (this.y < -10) this.y = height + 10;
        else if (this.y > height + 10) this.y = -10;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color}, 0.9)`;
        if (lowPower) {
          ctx.fill();
          return;
        }
        // shadowBlur gives a soft glow but is costly, so desktop only
        ctx.shadowColor = `rgba(${this.color}, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = hero.getBoundingClientRect();
      const prevWidth = width;
      const prevHeight = height;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Mobile browsers fire resize when the address bar shows/hides (small
      // height change only). Keep the existing particles in that case.
      const minorChange = width === prevWidth && Math.abs(height - prevHeight) < 160;
      if (particles.length && minorChange) return;

      // Density scales with area; capped for performance
      const count = Math.min(MAX_PARTICLES, Math.floor((width * height) / AREA_PER_PARTICLE));
      particles = Array.from({ length: count }, () => new Particle());
    };

    const drawLinks = () => {
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < LINK_DIST * LINK_DIST) {
            const alpha = (1 - Math.sqrt(distSq) / LINK_DIST) * 0.35;
            ctx.strokeStyle = `rgba(${a.color}, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        // Bright "energy" links to the cursor
        if (mouse.active) {
          const dist = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (dist < MOUSE_RADIUS + 40) {
            const alpha = (1 - dist / (MOUSE_RADIUS + 40)) * 0.6;
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      drawLinks();
      particles.forEach((p) => p.draw());
    };

    let lastFrame = 0;
    const loop = (now) => {
      rafId = requestAnimationFrame(loop);
      if (FRAME_INTERVAL && now - lastFrame < FRAME_INTERVAL) return;
      lastFrame = now;

      // At a capped 30fps, step physics twice so motion speed matches 60fps
      const steps = FRAME_INTERVAL ? 2 : 1;
      for (let s = 0; s < steps; s++) particles.forEach((p) => p.update());
      render();
    };

    const start = () => {
      if (rafId === null && heroVisible && !document.hidden && !prefersReducedMotion) {
        rafId = requestAnimationFrame(loop);
      }
    };

    const stop = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    // Pointer tracking (listen on the hero so content above the canvas still counts)
    hero.addEventListener("pointermove", (e) => {
      // Touch "moves" are scrolls, not hovering, so only follow a real mouse/pen
      if (e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    hero.addEventListener("pointerleave", () => {
      mouse.active = false;
    });

    // Click burst: fling nearby particles outward
    hero.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      particles.forEach((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 260) {
          const force = (260 - dist) / 260;
          p.vx += (dx / dist) * force * 7;
          p.vy += (dy / dist) * force * 7;
        }
      });
    });

    // Debounced resize
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (prefersReducedMotion) render();
      }, 150);
    });

    // Pause when off-screen or tab hidden
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        heroVisible ? start() : stop();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    resize();
    if (prefersReducedMotion) {
      render(); // static network, no motion
    } else {
      start();
    }
  }

  /* ----------------------------------------------------------------
     8. CONTACT FORM
     Validates input, shows a loading state, then opens the visitor's
     email client with a pre-filled message to CONTACT_EMAIL.
     ---------------------------------------------------------------- */
  function initContactForm() {
    const form = document.getElementById("auditForm");
    const success = document.getElementById("formSuccess");
    const submitBtn = document.getElementById("submitBtn");
    const resetBtn = document.getElementById("formReset");
    if (!form || !success || !submitBtn) return;

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Accept "yourbrand.com" as well as full URLs
    const normalizeUrl = (value) => {
      const v = value.trim();
      if (!v) return "";
      return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    };

    const isValidUrl = (value) => {
      try {
        const url = new URL(value);
        return url.hostname.includes(".");
      } catch {
        return false;
      }
    };

    // Each rule returns an error message, or "" if valid
    const rules = {
      fullName: (v) => (v.trim().length >= 2 ? "" : "Please enter your full name."),
      email: (v) => (EMAIL_RE.test(v.trim()) ? "" : "Please enter a valid business email."),
      website: (v) => (!v.trim() || isValidUrl(normalizeUrl(v)) ? "" : "Please enter a valid website URL."),
      adSpend: (v) => (v ? "" : "Please select your monthly ad spend."),
      message: (v) => (v.trim().length >= 10 ? "" : "Tell us a little more (at least 10 characters)."),
    };

    const setError = (field, message) => {
      const wrapper = field.closest(".field");
      if (!wrapper) return;
      wrapper.classList.toggle("has-error", Boolean(message));
      field.setAttribute("aria-invalid", message ? "true" : "false");
      const errorEl = wrapper.querySelector(".field-error");
      if (errorEl) errorEl.textContent = message;
    };

    const validateField = (field) => {
      const rule = rules[field.name];
      if (!rule) return true;
      const message = rule(field.value);
      setError(field, message);
      return !message;
    };

    // Clear/refresh errors as the user edits a field they've already touched
    form.addEventListener("input", (e) => {
      if (e.target.closest(".field.has-error")) validateField(e.target);
    });
    form.addEventListener("change", (e) => {
      if (e.target.tagName === "SELECT") validateField(e.target);
    });
    form.addEventListener("focusout", (e) => {
      if (e.target.value) validateField(e.target);
    });

    const buildMailto = (data) => {
      const subject = `Free Audit Request: ${data.fullName}`;
      const body = [
        "Hi SCALETHRU MEDIA team,",
        "",
        "I'd like to book a free audit.",
        "",
        `Full Name: ${data.fullName}`,
        `Business Email: ${data.email}`,
        `Company Website: ${data.website || "N/A"}`,
        `Monthly Ad Spend: ${data.adSpend}`,
        `Service of Interest: ${SERVICE_LABELS[data.service] || SERVICE_LABELS["not-sure"]}`,
        "",
        "Project Details:",
        data.message,
      ].join("\n");

      return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const fields = Array.from(form.querySelectorAll("input, select, textarea"));
      const results = fields.map(validateField);
      if (results.includes(false)) {
        const firstInvalid = fields[results.indexOf(false)];
        firstInvalid.focus();
        return;
      }

      const data = {
        fullName: form.fullName.value.trim(),
        email: form.email.value.trim(),
        website: normalizeUrl(form.website.value),
        adSpend: form.adSpend.value,
        service: form.service.value,
        message: form.message.value.trim(),
      };

      // Loading state
      submitBtn.classList.add("is-loading");
      submitBtn.setAttribute("aria-busy", "true");
      submitBtn.querySelector(".btn-label").textContent = "Preparing your request...";

      window.setTimeout(() => {
        window.location.href = buildMailto(data);

        submitBtn.classList.remove("is-loading");
        submitBtn.removeAttribute("aria-busy");
        submitBtn.querySelector(".btn-label").textContent = "Book My Free Audit";

        form.hidden = true;
        success.hidden = false;
        success.setAttribute("tabindex", "-1");
        success.focus({ preventScroll: true });
      }, 1100);
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        form.reset();
        form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
        form.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));
        success.hidden = true;
        form.hidden = false;
        form.fullName.focus();
      });
    }
  }

  /* ----------------------------------------------------------------
     9. SERVICE PREFILL
     Any link with data-service="<value>" (service cards, case study
     CTAs, footer links) pre-selects that service in the contact form.
     ---------------------------------------------------------------- */
  function initServicePrefill() {
    const form = document.getElementById("auditForm");
    const select = document.getElementById("service");
    const field = document.getElementById("serviceField");
    const success = document.getElementById("formSuccess");
    if (!form || !select || !field) return;

    const canFocusWithoutKeyboard = window.matchMedia("(pointer: fine)").matches;

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-service]");
      if (!trigger) return;

      const value = trigger.dataset.service;
      if (![...select.options].some((o) => o.value === value)) return;
      select.value = value;

      // If the form was already submitted, bring it back
      if (form.hidden && success) {
        form.hidden = false;
        success.hidden = true;
      }

      // Replay the highlight flash
      field.classList.remove("is-prefilled");
      void field.offsetWidth; // force reflow so the animation restarts
      field.classList.add("is-prefilled");

      // After the smooth scroll, put the cursor in the first empty field
      // (desktop only; on phones this would pop the keyboard up unasked)
      if (canFocusWithoutKeyboard) {
        window.setTimeout(() => {
          const firstEmpty = [...form.querySelectorAll("input, textarea")].find((el) => !el.value.trim());
          if (firstEmpty) firstEmpty.focus({ preventScroll: true });
        }, prefersReducedMotion ? 0 : 750);
      }
    });
  }

  /* ----------------------------------------------------------------
     10. CASE STUDY DIALOG
     Buttons with data-case="<template id>" render that <template>
     into the shared <dialog id="caseDialog">.
     ---------------------------------------------------------------- */
  function initCaseDialog() {
    const dialog = document.getElementById("caseDialog");
    const body = document.getElementById("caseDialogBody");
    const closeBtn = document.getElementById("caseDialogClose");
    if (!dialog || !body || typeof dialog.showModal !== "function") return;

    let lastTrigger = null;

    const open = (templateId, trigger) => {
      const template = document.getElementById(templateId);
      if (!template) return;
      lastTrigger = trigger;
      body.replaceChildren(template.content.cloneNode(true));
      body.scrollTop = 0;
      document.body.classList.add("dialog-open");
      dialog.showModal();
      closeBtn.focus();
    };

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-case]");
      if (trigger) open(trigger.dataset.case, trigger);
    });

    closeBtn.addEventListener("click", () => dialog.close());

    // Clicking the dimmed backdrop (the <dialog> element itself) closes it
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });

    // The "Get results like these" CTA closes the dialog, then the link scrolls to #contact
    body.addEventListener("click", (e) => {
      if (e.target.closest('a[href^="#"]')) {
        lastTrigger = null; // focus moves to the form instead
        dialog.close();
      }
    });

    // Fires for Escape, the close button, backdrop clicks, and CTA clicks
    dialog.addEventListener("close", () => {
      document.body.classList.remove("dialog-open");
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    });
  }

  /* ----------------------------------------------------------------
     11. MOBILE STICKY CTA
     Visible (on small screens, via CSS) once the hero has scrolled
     away, hidden again while the contact form itself is on screen.
     ---------------------------------------------------------------- */
  function initMobileCta() {
    const bar = document.getElementById("mobileCta");
    const hero = document.getElementById("home");
    const contact = document.getElementById("contact");
    if (!bar || !hero || !contact || !("IntersectionObserver" in window)) return;

    const link = bar.querySelector("a");
    let heroInView = true;
    let contactInView = false;

    const update = () => {
      const show = !heroInView && !contactInView;
      bar.classList.toggle("is-visible", show);
      bar.setAttribute("aria-hidden", String(!show));
      if (link) link.tabIndex = show ? 0 : -1;
    };

    new IntersectionObserver(([entry]) => {
      heroInView = entry.isIntersecting;
      update();
    }, { rootMargin: "0px 0px -40% 0px" }).observe(hero);

    new IntersectionObserver(([entry]) => {
      contactInView = entry.isIntersecting;
      update();
    }, { threshold: 0.15 }).observe(contact);
  }

  /* ----------------------------------------------------------------
     BOOT
     ---------------------------------------------------------------- */
  const boot = () => {
    initHeader();
    initMobileMenu();
    initScrollSpy();
    initReveals();
    initCounters();
    initCardSpotlight();
    initParticles();
    initContactForm();
    initServicePrefill();
    initCaseDialog();
    initMobileCta();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
