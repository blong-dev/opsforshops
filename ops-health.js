document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("diagnostic-form");
  const formContainer = document.getElementById("ops-health-form");
  const resultsContainer = document.getElementById("ops-health-results");
  if (!form || !formContainer || !resultsContainer) return;

  const startTime = Date.now();
  let currentStep = 1;
  const totalSteps = 4;

  // ── Wizard Navigation ──

  function showStep(step) {
    form.querySelectorAll(".ops-health__step").forEach((el) => {
      el.classList.toggle("is-active", Number(el.dataset.step) === step);
    });
    form.querySelectorAll(".ops-health__progress-segment").forEach((seg) => {
      const s = Number(seg.dataset.step);
      seg.classList.toggle("is-complete", s < step);
      seg.classList.toggle("is-active", s === step);
    });
    currentStep = step;
    formContainer.querySelector(".ops-health__progress").setAttribute("aria-valuenow", step);
  }

  function validateStep(step) {
    const fieldset = form.querySelector(`.ops-health__step[data-step="${step}"]`);
    if (!fieldset) return true;

    // Check required selects
    const selects = fieldset.querySelectorAll("select[required]");
    for (const sel of selects) {
      if (!sel.value) {
        sel.focus();
        return false;
      }
    }

    // Check required radio groups
    const radioNames = new Set();
    fieldset.querySelectorAll('input[type="radio"][required]').forEach((r) => radioNames.add(r.name));
    for (const name of radioNames) {
      if (!fieldset.querySelector(`input[name="${name}"]:checked`)) {
        const first = fieldset.querySelector(`input[name="${name}"]`);
        if (first) first.focus();
        return false;
      }
    }

    return true;
  }

  form.addEventListener("click", (e) => {
    if (e.target.closest(".ops-health__next")) {
      if (validateStep(currentStep) && currentStep < totalSteps) {
        showStep(currentStep + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    if (e.target.closest(".ops-health__back")) {
      if (currentStep > 1) {
        showStep(currentStep - 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
    if (e.target.closest(".ops-health__submit")) {
      if (!validateStep(currentStep)) return;
      handleSubmit();
    }
  });

  // ── Range Slider Live Value ──

  const rangeInput = document.getElementById("data_trust");
  const rangeValue = document.getElementById("data-trust-value");
  if (rangeInput && rangeValue) {
    rangeInput.addEventListener("input", () => {
      rangeValue.textContent = rangeInput.value;
    });
  }

  // ── Collect Answers ──

  function collectAnswers() {
    const data = {};

    // Selects
    data.revenue = form.querySelector("#revenue")?.value || "";
    data.employees = form.querySelector("#employees")?.value || "";

    // Radios
    const radioFields = [
      "sales_channel", "inventory", "reconciliation", "sops",
      "onboarding", "headache", "automatable_hours",
    ];
    for (const name of radioFields) {
      const checked = form.querySelector(`input[name="${name}"]:checked`);
      data[name] = checked ? checked.value : "";
    }

    // Range
    data.data_trust = Number(rangeInput?.value ?? 5);

    // Checkboxes
    const tools = [];
    form.querySelectorAll('input[name="tools"]:checked').forEach((cb) => tools.push(cb.value));
    data.tools = tools;

    return data;
  }

  // ── Scoring Engine (placeholder — refine with Cosmo) ──

  function computeScore(answers) {
    let score = 0;

    // Revenue & Scale (15 pts)
    const revScores = { under_250k: 5, "250k_500k": 8, "500k_1m": 11, "1m_5m": 13, "5m_plus": 15 };
    score += revScores[answers.revenue] || 5;

    // Operations Maturity (40 pts)
    // Inventory (10)
    const invScores = { manual: 2, basic_software: 5, integrated: 10, na: 6 };
    score += invScores[answers.inventory] || 2;

    // Reconciliation (10)
    const reconScores = { daily_weekly: 10, monthly: 7, quarterly: 4, rarely: 1 };
    score += reconScores[answers.reconciliation] || 1;

    // SOPs (10)
    const sopScores = { yes: 10, some: 5, no: 1 };
    score += sopScores[answers.sops] || 1;

    // Onboarding (10)
    const onbScores = { under_1_week: 10, "1_2_weeks": 7, "3_4_weeks": 4, over_1_month: 1, na: 8 };
    score += onbScores[answers.onboarding] || 4;

    // Pain Signals (25 pts)
    // Data trust (10) — direct mapping
    score += answers.data_trust;

    // Automatable hours — fewer is better (10)
    const autoScores = { "0_2": 10, "3_5": 7, "6_10": 4, "10_plus": 1, no_idea: 3 };
    score += autoScores[answers.automatable_hours] || 3;

    // Headache penalty — some headaches indicate worse ops health (5 max)
    const headacheScores = { data_entry: 2, systems_dont_talk: 1, cant_trust_numbers: 1, employee_training: 3, scaling: 2, other: 5 };
    score += headacheScores[answers.headache] || 3;

    // Tech Stack (20 pts)
    const tools = answers.tools || [];
    const integratedTools = ["quickbooks", "xero", "square", "shopify", "clover", "toast", "hubspot"];
    const integratedCount = tools.filter((t) => integratedTools.includes(t)).length;
    const hasPenPaper = tools.includes("pen_paper");
    const hasExcel = tools.includes("excel_sheets");

    if (integratedCount >= 3) {
      score += 20;
    } else if (integratedCount === 2) {
      score += 15;
    } else if (integratedCount === 1) {
      score += 10;
    } else if (hasExcel) {
      score += 5;
    } else if (hasPenPaper || tools.length === 0) {
      score += 2;
    } else {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ── Blind Spot Detection ──

  function findBlindSpots(answers) {
    const spots = [];

    // Scaling Bottleneck
    if (
      answers.sops === "no" &&
      (answers.onboarding === "3_4_weeks" || answers.onboarding === "over_1_month")
    ) {
      spots.push({
        title: "Scaling Bottleneck",
        description:
          "No documented SOPs combined with long onboarding times means your growth is bottlenecked by tribal knowledge. Every new hire is a slow, expensive ramp-up.",
      });
    }

    // Financial Blind Spot
    if (
      (answers.reconciliation === "rarely" || answers.reconciliation === "quarterly") &&
      answers.data_trust <= 5
    ) {
      spots.push({
        title: "Financial Blind Spot",
        description:
          "Infrequent reconciliation and low data trust means you're making financial decisions without reliable inputs. This typically leads to cash flow surprises.",
      });
    }

    // Integration Gap
    if (
      answers.headache === "systems_dont_talk" &&
      (answers.automatable_hours === "6_10" || answers.automatable_hours === "10_plus")
    ) {
      spots.push({
        title: "Integration Gap",
        description:
          "Disconnected systems are eating 6+ hours of your week. That's time spent moving data between tools that should be talking to each other automatically.",
      });
    }

    // Outgrown Your Tools
    if (
      answers.inventory === "manual" &&
      answers.revenue !== "under_250k"
    ) {
      spots.push({
        title: "Outgrown Your Tools",
        description:
          "Manual inventory tracking at your revenue level typically costs 8–12 hours per week in reconciliation and missed stock issues.",
      });
    }

    // Decision Confidence Gap
    if (answers.data_trust <= 4) {
      spots.push({
        title: "Decision Confidence Gap",
        description:
          "A data trust score of " + answers.data_trust + "/10 means you're making critical decisions without confidence in the underlying numbers. This is the most common root cause we see.",
      });
    }

    // Automation Debt
    if (
      answers.headache === "data_entry" &&
      (answers.automatable_hours === "6_10" || answers.automatable_hours === "10_plus")
    ) {
      spots.push({
        title: "Automation Debt",
        description:
          "Data entry is your top headache and you're losing 6+ hours a week to it. Most of this is automatable with the right tool connections.",
      });
    }

    // Return top 3
    return spots.slice(0, 3);
  }

  // ── Percentile Estimate ──

  function estimatePercentile(score) {
    // Rough mapping for display purposes
    if (score >= 85) return "90th";
    if (score >= 75) return "75th";
    if (score >= 65) return "60th";
    if (score >= 55) return "45th";
    if (score >= 45) return "30th";
    if (score >= 35) return "20th";
    return "10th";
  }

  // ── Render Scorecard ──

  function renderScorecard(score, blindSpots, answers) {
    // Score
    const scoreEl = document.getElementById("score-value");
    scoreEl.textContent = score + "/100";
    if (score < 50) scoreEl.classList.add("score--red");
    else if (score < 75) scoreEl.classList.add("score--yellow");
    else scoreEl.classList.add("score--green");

    // Bar
    const barFill = document.getElementById("score-bar-fill");
    barFill.style.width = score + "%";
    if (score < 50) barFill.classList.add("bar--red");
    else if (score < 75) barFill.classList.add("bar--yellow");
    else barFill.classList.add("bar--green");

    // Percentile
    const pctEl = document.getElementById("score-percentile");
    const pct = estimatePercentile(score);
    pctEl.textContent =
      "You\u2019re at roughly the " + pct + " percentile for businesses in your revenue range.";

    // Blind spots
    const container = document.getElementById("blindspots-container");
    if (blindSpots.length === 0) {
      container.innerHTML = "<h2>Looking Good</h2><p>We didn't flag any major blind spots. Your operations are in solid shape.</p>";
    } else {
      let html = "<h2>Blind Spots We Found</h2>";
      for (const spot of blindSpots) {
        html +=
          '<div class="scorecard__blindspot">' +
          "<h3>" + spot.title + "</h3>" +
          "<p>" + spot.description + "</p>" +
          "</div>";
      }
      container.innerHTML = html;
    }

    // Show results
    formContainer.hidden = true;
    resultsContainer.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── UTM Extraction ──

  function getUtmParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
    };
  }

  // ── Submit to Worker ──

  function submitToWorker(payload) {
    fetch("/api/ops-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Non-blocking — scorecard already rendered
    });
  }

  // ── Main Submit Handler ──

  function handleSubmit() {
    const answers = collectAnswers();
    const score = computeScore(answers);
    const blindSpots = findBlindSpots(answers);
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    renderScorecard(score, blindSpots, answers);

    // Fire submission async
    const payload = {
      score: score,
      answers: answers,
      blind_spots: blindSpots,
      time_spent_seconds: timeSpent,
      referrer: document.referrer || "",
      ...getUtmParams(),
    };
    submitToWorker(payload);

    // Store payload for email capture update
    resultsContainer._leadPayload = payload;
  }

  // ── Email Capture ──

  const emailForm = document.getElementById("email-capture-form");
  const toast = document.querySelector(".toast");

  if (emailForm) {
    emailForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const nameVal = emailForm.querySelector("#lead-name")?.value.trim() || "";
      const emailVal = emailForm.querySelector("#lead-email")?.value.trim() || "";
      const emailError = emailForm.querySelector("#lead-email-error");

      if (emailError) emailError.textContent = "";

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        if (emailError) emailError.textContent = "Enter a valid email address.";
        return;
      }

      // Send updated payload with email
      const payload = resultsContainer._leadPayload || {};
      payload.email = emailVal;
      payload.name = nameVal;
      submitToWorker(payload);

      // Show confirmation
      if (toast && typeof showToast === "function") {
        showToast(toast, "Scorecard sent! Check your inbox.", "success");
      } else {
        emailForm.innerHTML = '<p class="eyebrow">Sent! Check your inbox.</p>';
      }
    });
  }
});
