const state = {
  prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
  isNarrow: window.matchMedia("(max-width: 48rem)")
};

document.addEventListener("DOMContentLoaded", () => {
  updateYear();
  initNav();
  initSmoothScroll();
  initSectionObserver();
  initCarousels();
  initParallax();
  initContactForm();
});

function updateYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

function initNav() {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelector(".nav-links");
  if (!navToggle || !navLinks) {
    return;
  }

  const links = navLinks.querySelectorAll("a");

  navToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.forEach((link) => {
    link.addEventListener("click", () => {
      if (navLinks.classList.contains("is-open")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  });

  state.isNarrow.addEventListener("change", ({ matches }) => {
    if (!matches) {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initSmoothScroll() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = document.querySelector(hash);
      if (!target) return;
      event.preventDefault();
      const behavior = state.prefersReducedMotion.matches ? "auto" : "smooth";
      target.scrollIntoView({ behavior, block: "start" });
      if (window.history.pushState) {
        window.history.pushState(null, "", hash);
      }
    });
  });
}

function initSectionObserver() {
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".nav-link");
  if (!sections.length || !navLinks.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            const isActive = link.getAttribute("href") === `#${id}`;
            link.classList.toggle("is-active", isActive);
          });
        }
      });
    },
    {
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0.1
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initCarousels() {
  const carousels = document.querySelectorAll("[data-carousel]");
  carousels.forEach((carousel) => {
    const track = carousel.querySelector(".carousel__track");
    const prev = carousel.querySelector('[data-direction="prev"]');
    const next = carousel.querySelector('[data-direction="next"]');
    if (!track) return;

    const scrollByAmount = () => Math.min(track.clientWidth * 0.8, 400);

    const scroll = (direction) => {
      const amount = direction === "next" ? scrollByAmount() : -scrollByAmount();
      track.scrollBy({ left: amount, behavior: "smooth" });
    };

    if (prev) {
      prev.addEventListener("click", () => scroll("prev"));
    }

    if (next) {
      next.addEventListener("click", () => scroll("next"));
    }

    let autoAdvanceId;
    const startAutoAdvance = () => {
      if (state.prefersReducedMotion.matches || state.isNarrow.matches) return;
      stopAutoAdvance();
      autoAdvanceId = window.setInterval(() => scroll("next"), 9000);
    };
    const stopAutoAdvance = () => {
      if (autoAdvanceId) {
        window.clearInterval(autoAdvanceId);
        autoAdvanceId = undefined;
      }
    };

    track.addEventListener("mouseenter", stopAutoAdvance);
    track.addEventListener("mouseleave", startAutoAdvance);
    track.addEventListener("focusin", stopAutoAdvance);
    track.addEventListener("focusout", startAutoAdvance);

    state.prefersReducedMotion.addEventListener("change", startAutoAdvance);
    state.isNarrow.addEventListener("change", startAutoAdvance);

    startAutoAdvance();
  });
}

function initParallax() {
  const parallaxEl = document.querySelector(".parallax");
  if (!parallaxEl) return;

  let ticking = false;

  const resetParallax = () => {
    parallaxEl.style.transform = "translateY(0)";
  };

  const update = () => {
    if (state.prefersReducedMotion.matches || state.isNarrow.matches) {
      resetParallax();
      ticking = false;
      return;
    }
    const maxOffset = parallaxEl.offsetHeight * 0.12;
    const scrollY = window.scrollY || window.pageYOffset;
    const offset = Math.min(maxOffset, scrollY * 0.12);
    parallaxEl.style.transform = `translateY(${offset}px)`;
    ticking = false;
  };

  const onScroll = () => {
    if (state.prefersReducedMotion.matches || state.isNarrow.matches) return;
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  state.prefersReducedMotion.addEventListener("change", resetParallax);
  state.isNarrow.addEventListener("change", (event) => {
    if (event.matches) {
      resetParallax();
    } else {
      update();
    }
  });

  update();
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  const toast = document.querySelector(".toast");
  if (!form || !toast) return;

  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent ?? "";
  const formAction = form.getAttribute("action");
  const formMethod = (form.getAttribute("method") || "POST").toUpperCase();

  const fields = {
    name: form.querySelector("#name"),
    email: form.querySelector("#email"),
    message: form.querySelector("#message")
  };

  const errors = {
    name: form.querySelector("#name-error"),
    email: form.querySelector("#email-error"),
    message: form.querySelector("#message-error")
  };

  const showError = (field, message) => {
    const errorEl = errors[field];
    if (errorEl) errorEl.textContent = message;
  };

  const clearErrors = () => {
    Object.values(errors).forEach((el) => {
      if (el) el.textContent = "";
    });
  };

  const setSubmitting = (isSubmitting) => {
    if (!submitButton) return;
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Sending…" : originalButtonText;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearErrors();

    let isValid = true;
    const name = fields.name?.value.trim() ?? "";
    const email = fields.email?.value.trim() ?? "";
    const message = fields.message?.value.trim() ?? "";

    if (name.length < 2) {
      showError("name", "Please share your name.");
      isValid = false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("email", "Enter a valid email address.");
      isValid = false;
    }

    if (message.length < 10) {
      showError("message", "Give a little more detail (10+ characters).");
      isValid = false;
    }

    if (!isValid) return;

    if (!formAction) {
      showToast(toast, "Form endpoint unavailable. Please try again later.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData(form);
      const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];
      formData.append("_subject", `NEW CUSTOMER ${timestamp}`);

      const response = await fetch(formAction, {
        method: formMethod,
        body: formData,
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      form.reset();
      showToast(toast, "Thanks! Your note is on its way. I’ll reply soon.", "success");
    } catch (error) {
      console.error("Form submission error:", error);
      showToast(
        toast,
        "Something went wrong sending your note. Please email land@braedonlong.com directly.",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  });
}

function showToast(toastEl, message, variant = "success") {
  toastEl.textContent = message;
  toastEl.dataset.variant = variant;
  toastEl.hidden = false;
  toastEl.classList.add("is-visible");

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toastEl.classList.remove("is-visible");
    toastEl.addEventListener(
      "transitionend",
      () => {
        toastEl.hidden = true;
      },
      { once: true }
    );
  }, 4000);
}
