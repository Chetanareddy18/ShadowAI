const bgCanvas = document.getElementById("bg-canvas");
const healthPill = document.getElementById("health-pill");
const apiUrlInput = document.getElementById("api-url");
const apiKeyInput = document.getElementById("api-key");
const promptInput = document.getElementById("prompt-input");
const sendBtn = document.getElementById("send-btn");

const decisionBox = document.getElementById("decision-box");
const riskTag = document.getElementById("risk-tag");
const decisionTitle = document.getElementById("decision-title");
const decisionText = document.getElementById("decision-text");
const findingsWrap = document.getElementById("findings-wrap");
const eventList = document.getElementById("event-list");

const metricTotal = document.getElementById("metric-total");
const metricBlocked = document.getElementById("metric-blocked");
const metricSanitized = document.getElementById("metric-sanitized");
const metricAllowed = document.getElementById("metric-allowed");

const counters = {
  total: 0,
  blocked: 0,
  sanitized: 0,
  allowed: 0,
};

function setHealthPill(text, kind) {
  healthPill.textContent = text;
  if (kind === "ok") {
    healthPill.style.color = "#5affc7";
    healthPill.style.borderColor = "rgba(90, 255, 199, 0.45)";
    return;
  }
  if (kind === "warn") {
    healthPill.style.color = "#ffb34d";
    healthPill.style.borderColor = "rgba(255, 179, 77, 0.45)";
    return;
  }
  healthPill.style.color = "#ff6e7f";
  healthPill.style.borderColor = "rgba(255, 110, 127, 0.45)";
}

async function checkHealth() {
  const base = apiUrlInput.value.trim();
  if (!base) {
    setHealthPill("Gateway URL missing", "err");
    return;
  }

  try {
    const res = await fetch(`${base}/health`);
    if (!res.ok) {
      setHealthPill(`Gateway unhealthy (${res.status})`, "warn");
      return;
    }
    setHealthPill("Gateway online", "ok");
  } catch {
    setHealthPill("Gateway offline", "err");
  }
}

function setRiskStyle(risk) {
  if (risk === "CRITICAL") {
    riskTag.style.background = "rgba(255, 110, 127, 0.2)";
    riskTag.style.color = "#ff9ba6";
    return;
  }
  if (risk === "HIGH") {
    riskTag.style.background = "rgba(255, 179, 77, 0.2)";
    riskTag.style.color = "#ffc06d";
    return;
  }
  if (risk === "MEDIUM") {
    riskTag.style.background = "rgba(255, 222, 129, 0.2)";
    riskTag.style.color = "#ffe28e";
    return;
  }
  riskTag.style.background = "rgba(90, 255, 199, 0.2)";
  riskTag.style.color = "#8affd6";
}

function renderFindings(findings) {
  findingsWrap.innerHTML = "";
  const entries = Object.entries(findings || {});

  if (!entries.length) {
    const chip = document.createElement("span");
    chip.className = "finding-chip";
    chip.textContent = "No sensitive findings";
    findingsWrap.appendChild(chip);
    return;
  }

  for (const [key, value] of entries) {
    const chip = document.createElement("span");
    chip.className = "finding-chip";
    const count = Array.isArray(value) ? value.length : 1;
    chip.textContent = `${key} (${count})`;
    findingsWrap.appendChild(chip);
  }
}

function renderCounters() {
  metricTotal.textContent = counters.total;
  metricBlocked.textContent = counters.blocked;
  metricSanitized.textContent = counters.sanitized;
  metricAllowed.textContent = counters.allowed;
}

function pushEvent(text, tone = "normal") {
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()}  ${text}`;

  if (tone === "bad") {
    li.style.borderColor = "rgba(255, 110, 127, 0.42)";
    li.style.color = "#ffbcc5";
  } else if (tone === "warn") {
    li.style.borderColor = "rgba(255, 179, 77, 0.42)";
    li.style.color = "#ffd8a7";
  } else if (tone === "good") {
    li.style.borderColor = "rgba(90, 255, 199, 0.42)";
    li.style.color = "#baffea";
  }

  eventList.prepend(li);

  while (eventList.children.length > 9) {
    eventList.removeChild(eventList.lastChild);
  }
}

async function submitPrompt() {
  const prompt = promptInput.value.trim();
  const apiBase = apiUrlInput.value.trim();
  const apiKey = apiKeyInput.value.trim();

  if (!prompt) {
    pushEvent("Prompt is empty", "warn");
    return;
  }

  if (!apiBase || !apiKey) {
    pushEvent("Gateway URL or API key missing", "bad");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Analyzing";

  try {
    const response = await fetch(`${apiBase}/process_prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ prompt }),
    });

    const payload = await response.json();

    if (!response.ok) {
      decisionTitle.textContent = `Gateway error (${response.status})`;
      decisionText.textContent = payload.detail || payload.message || "Request failed.";
      riskTag.textContent = "Risk: --";
      setRiskStyle("HIGH");
      renderFindings({});
      pushEvent(`Gateway rejected request (${response.status})`, "bad");
      return;
    }

    const decision = payload.decision || "UNKNOWN";
    const risk = payload.risk_level || "LOW";

    counters.total += 1;
    if (decision === "BLOCK") counters.blocked += 1;
    if (decision === "SANITIZE") counters.sanitized += 1;
    if (decision === "ALLOW") counters.allowed += 1;
    renderCounters();

    riskTag.textContent = `Risk: ${risk}`;
    setRiskStyle(risk);

    if (decision === "BLOCK") {
      decisionTitle.textContent = "Prompt Blocked";
      decisionText.textContent = payload.message || "Critical threat detected.";
      decisionBox.style.borderColor = "rgba(255, 110, 127, 0.42)";
      pushEvent(`Blocked (${risk})`, "bad");
    } else if (decision === "SANITIZE") {
      decisionTitle.textContent = "Prompt Sanitized";
      decisionText.textContent = payload.llm_response || "Prompt sanitized and sent safely.";
      decisionBox.style.borderColor = "rgba(255, 179, 77, 0.42)";
      pushEvent(`Sanitized (${risk})`, "warn");
    } else {
      decisionTitle.textContent = "Prompt Allowed";
      decisionText.textContent = payload.llm_response || "Request processed.";
      decisionBox.style.borderColor = "rgba(90, 255, 199, 0.38)";
      pushEvent(`Allowed (${risk})`, "good");
    }

    renderFindings(payload.findings || {});
  } catch (error) {
    decisionTitle.textContent = "Connection Error";
    decisionText.textContent = `Could not reach gateway: ${error.message}`;
    riskTag.textContent = "Risk: --";
    setRiskStyle("HIGH");
    renderFindings({});
    pushEvent("Failed to connect to gateway", "bad");
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Analyze Prompt";
  }
}

function initCanvas() {
  const ctx = bgCanvas.getContext("2d");
  const points = [];

  function resize() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  function resetPoints() {
    points.length = 0;
    const count = Math.max(18, Math.floor(window.innerWidth / 95));
    for (let i = 0; i < count; i += 1) {
      points.push({
        x: Math.random() * bgCanvas.width,
        y: Math.random() * bgCanvas.height,
        vx: (Math.random() - 0.5) * 0.38,
        vy: (Math.random() - 0.5) * 0.38,
        r: 1 + Math.random() * 2,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0 || p.x > bgCanvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > bgCanvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.fillStyle = "rgba(130, 219, 255, 0.7)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const a = points[i];
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const alpha = 1 - dist / 120;
          ctx.strokeStyle = `rgba(17, 212, 214, ${alpha * 0.22})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  resetPoints();
  draw();

  window.addEventListener("resize", () => {
    resize();
    resetPoints();
  });
}

sendBtn.addEventListener("click", submitPrompt);

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    submitPrompt();
  }
});

apiUrlInput.addEventListener("change", checkHealth);
window.addEventListener("load", () => {
  initCanvas();
  checkHealth();
  renderCounters();
  pushEvent("Command center initialized", "good");
});
