// stats.js - v3.1 Modern Analytics with Global Header/Footer
// Render global header & footer
const headerEl = document.getElementById("dcHeader");
const footerEl = document.getElementById("dcFooter");
if (headerEl) {
  headerEl.innerHTML = dcRenderHeader("analytics", "Track your focus sessions, breaks taken, hydration, and see how Focus Mode protects you from distractions.");
}
if (footerEl) footerEl.innerHTML = dcRenderFooter();
dcInitNav();

const totalEl = document.getElementById("total");
const breaksEl = document.getElementById("breaks");
const streakEl = document.getElementById("streak");
const wellnessBar = document.getElementById("wellnessBar");
const wellnessText = document.getElementById("wellnessText");
const waterStatText = document.getElementById("waterStatText");
const waterPercent = document.getElementById("waterPercent");
const waterBar = document.getElementById("waterBar");
const activityGraph = document.getElementById("activityGraph");

// Plant elements
const plantStageLabel = document.getElementById("plantStageLabel");
const plantStatus = document.getElementById("plantStatus");
const plantInfoBtn = document.getElementById("plantInfoBtn");
const plantTooltip = document.getElementById("plantTooltip");

// Plant growth stages
const PLANT_STAGES = [
  { min: 0,  max: 24,  label: "Seed",        stageId: "stage-seed",    status: "Just planted..." },
  { min: 25, max: 49,  label: "Sprout",       stageId: "stage-sprout",  status: "Growing nicely!" },
  { min: 50, max: 74,  label: "Sapling",      stageId: "stage-sapling", status: "Getting stronger!" },
  { min: 75, max: 100, label: "Mature Plant",  stageId: "stage-mature",  status: "Fully Bloomed!" },
];

function getPlantStage(health) {
  for (const s of PLANT_STAGES) {
    if (health <= s.max) return s;
  }
  return PLANT_STAGES[3];
}

function updatePlantUI(health) {
  const stage = getPlantStage(health);
  const allStageIds = ["stage-seed", "stage-sprout", "stage-sapling", "stage-mature"];
  allStageIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === stage.stageId) el.classList.remove("hidden");
      else el.classList.add("hidden");
    }
  });

  if (plantStageLabel) plantStageLabel.textContent = stage.label;
  if (plantStatus) plantStatus.textContent = stage.status;

  // Tooltip
  const stageIdx = PLANT_STAGES.indexOf(stage);
  const isMax = stageIdx === 3;
  const nextStageLabel = isMax ? "Max Level" : PLANT_STAGES[stageIdx + 1].label;
  const tooltipStage = document.getElementById("tooltipStage");
  const tooltipDesc = document.getElementById("tooltipDesc");
  const tooltipProgress = document.getElementById("tooltipProgress");
  const plantProgressBar = document.getElementById("plantProgressBar");

  if (tooltipStage) tooltipStage.textContent = isMax ? "Fully Mature" : `${stage.label} → ${nextStageLabel}`;
  if (tooltipDesc) tooltipDesc.textContent = isMax ? "Your plant is thriving!" : "Complete focus sessions to grow your plant!";
  if (tooltipProgress) tooltipProgress.textContent = `${health} / 100 health points`;
  if (plantProgressBar) plantProgressBar.style.width = `${health}%`;
}

// Tooltip toggle
if (plantInfoBtn) {
  plantInfoBtn.addEventListener("click", () => {
    if (plantTooltip) plantTooltip.classList.toggle("hidden");
  });
}

function updateStats() {
  chrome.storage.sync.get(["totalReminders", "breaksTaken", "streakCount", "waterIntake", "waterGoal", "plantHealth"], data => {
    const total = data.totalReminders || 0;
    const breaks = data.breaksTaken || 0;
    const streak = data.streakCount || 0;
    const water = data.waterIntake || 0;
    const waterGoal = data.waterGoal || 8;

    if (totalEl) totalEl.textContent = total;
    if (breaksEl) breaksEl.textContent = breaks;
    if (streakEl) streakEl.textContent = streak;

    // Water
    if (waterStatText) waterStatText.textContent = `${water} / ${waterGoal} glasses`;
    const percent = Math.min(100, Math.round((water / waterGoal) * 100));
    if (waterBar) waterBar.style.width = `${percent}%`;
    if (waterPercent) waterPercent.textContent = `${percent}%`;

    // Wellness Score
    let score = 0;
    if (total > 0) score = Math.min(100, Math.round((breaks / total) * 100));
    if (wellnessBar) wellnessBar.style.width = score + "%";
    if (wellnessText) wellnessText.textContent = `${score}%`;

    // Plant
    const health = Math.max(0, Math.min(100, data.plantHealth !== undefined ? data.plantHealth : 0));
    updatePlantUI(health);
  });

  // Activity Graph
  chrome.storage.local.get(["dailyUsage"], data => {
    const usage = data.dailyUsage || {};
    if (!activityGraph) return;
    activityGraph.innerHTML = "";

    for (let i = 0; i < 24; i++) {
      const val = usage[i] || 0;
      const height = (val / 60) * 100;
      const bar = document.createElement("div");
      bar.style.cssText = `flex:1;height:${Math.max(2, height)}%;background:${val > 0 ? "var(--brand-lime)" : "var(--surface)"};border-radius:2px 2px 0 0;transition:height 0.3s ease;`;
      bar.title = `${i}:00 — ${val} mins`;
      activityGraph.appendChild(bar);
    }
  });
}

// Block Analytics
const totalBlocksEl = document.getElementById("totalBlocks");
const todayBlocksEl = document.getElementById("todayBlocks");
const uniqueDomainsEl = document.getElementById("uniqueDomains");
const blockSummaryEl = document.getElementById("blockSummary");
const blockDomainListEl = document.getElementById("blockDomainList");

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function updateBlockAnalytics() {
  chrome.storage.local.get(["blockedAttempts"], data => {
    const attempts = data.blockedAttempts || { total: 0, domains: {}, daily: {} };
    const total = attempts.total || 0;
    const domains = attempts.domains || {};
    const daily = attempts.daily || {};
    const uniqueCount = Object.keys(domains).length;
    const todayCount = daily[getTodayKey()] || 0;

    if (totalBlocksEl) totalBlocksEl.textContent = total;
    if (todayBlocksEl) todayBlocksEl.textContent = todayCount;
    if (uniqueDomainsEl) uniqueDomainsEl.textContent = uniqueCount;

    if (blockSummaryEl) {
      if (total === 0) {
        blockSummaryEl.textContent = "No distractions blocked yet. Focus Mode keeps you on track!";
      } else {
        blockSummaryEl.textContent = `Blocked ${todayCount} today, ${total} total across ${uniqueCount} site${uniqueCount !== 1 ? "s" : ""}.`;
      }
    }

    if (blockDomainListEl) {
      blockDomainListEl.innerHTML = "";
      if (uniqueCount === 0) return;

      const sorted = Object.entries(domains).sort((a, b) => b[1] - a[1]);
      const maxCount = sorted[0][1];

      sorted.forEach(([domain, count]) => {
        const pct = Math.max(5, (count / maxCount) * 100);
        const row = document.createElement("div");
        row.style.cssText = "margin-bottom: 8px;";
        row.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;margin-bottom:3px;">
            <span style="color:var(--text);font-weight:500;">${sanitize(domain)}</span>
            <span style="color:var(--text-muted);font-size:11px;">${count}</span>
          </div>
          <div style="height:3px;background:var(--surface);border-radius:2px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:var(--brand-lime);border-radius:2px;"></div>
          </div>`;
        blockDomainListEl.appendChild(row);
      });
    }
  });
}

// Security: sanitize domain text to prevent XSS
function sanitize(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

setInterval(updateStats, 2000);
setInterval(updateBlockAnalytics, 3000);
updateStats();
updateBlockAnalytics();
