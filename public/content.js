console.log("🔥 CONTENT SCRIPT LOADED");

function parseDate(dateText, timeText) {
  try {
    if (!dateText) return null;

    let day, month, year = new Date().getFullYear();
    let hours = 23, minutes = 59;

    const now = new Date();

    // Handle relative date words: "Today", "Tomorrow"
    if (dateText.toLowerCase().includes("today")) {
      day = now.getDate();
      month = now.getMonth();
    } else if (dateText.toLowerCase().includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      day = tomorrow.getDate();
      month = tomorrow.getMonth();
    } else {
      // Handle full format: "Monday, 13 April" or "13 April"
      const parts = dateText.split(",");
      const dayMonth = (parts[1] || parts[0]).trim();
      const partsDM = dayMonth.split(" ").filter(Boolean);

      day = parseInt(partsDM[0]);
      const monthName = partsDM[1];

      const months = {
        January: 0, February: 1, March: 2, April: 3,
        May: 4, June: 5, July: 6, August: 7,
        September: 8, October: 9, November: 10, December: 11
      };

      month = months[monthName];
      if (month === undefined) {
        console.error("❌ Invalid month:", monthName);
        return null;
      }
      if (isNaN(day)) {
        console.error("❌ Invalid day:", partsDM[0]);
        return null;
      }
    }

    // Parse time if provided
    if (timeText) {
      const match = timeText.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1]);
        const m = parseInt(match[2]);
        const modifier = match[3].toUpperCase();
        if (modifier === "AM" && h === 12) h = 0;
        if (modifier === "PM" && h !== 12) h += 12;
        hours = h;
        minutes = m;
      }
    }

    const finalDate = new Date(year, month, day, hours, minutes);
    if (isNaN(finalDate.getTime())) return null;
    return finalDate.toISOString();

  } catch (e) {
    console.error("❌ Date parsing failed:", dateText, timeText, e);
    return null;
  }
}

function extractAndSync() {
  const events = document.querySelectorAll('.event.d-flex.border-bottom[data-region="event-item"]');
  console.log(`🔍 Found ${events.length} event elements in DOM`);

  const extracted = [];

  events.forEach(event => {
    try {
      const titleEl = event.querySelector('a[data-type="event"]');
      const title = titleEl?.innerText.trim();
      const eventId = titleEl?.getAttribute("data-event-id");
      if (!title || !eventId) return;

      const dateContainer = event.querySelector('.date.small');
      if (!dateContainer) return;

      const dateAnchor = dateContainer.querySelector('a');
      const dateText = dateAnchor?.innerText.trim();
      if (!dateText) return;

      let timeText = "11:59 PM";
      dateContainer.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          const raw = node.textContent.trim().replace(/^,\s*/, "");
          if (raw) timeText = raw;
        }
      });

      const isoDate = parseDate(dateText, timeText);
      console.log("🧪 Parsed:", { title, dateText, timeText, isoDate });
      if (!isoDate) return;

      extracted.push({ external_id: eventId, title, due_date: isoDate });

    } catch (err) {
      console.error("❌ Error processing event:", err);
    }
  });

  console.log("✅ Extracted events:", extracted);

  if (extracted.length > 0) {
    fetch("http://localhost:8000/api/sync-deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: extracted })
    })
    .then(res => res.json())
    .then(data => console.log("📡 Backend response:", data))
    .catch(err => console.error("❌ Backend error:", err));
  }
}

function startSyncIfEnabled() {
  chrome.storage.local.get("syncEnabled", (result) => {
    if (result.syncEnabled) {
      console.log("✅ Sync is ON — sending deadlines...");
      extractAndSync();
    } else {
      console.log("⏸️ Sync is OFF — skipping.");
    }
  });
}

function waitForEvents() {
  console.log("⏳ Waiting for event widgets to load...");

  let attempts = 0;
  const maxAttempts = 60;

  const interval = setInterval(() => {
    attempts++;
    const items = document.querySelectorAll('.event.d-flex.border-bottom[data-region="event-item"]');
    if (items.length > 0) {
      clearInterval(interval);
      console.log(`✅ Events found after ${attempts} attempts`);
      startSyncIfEnabled();
      return;
    }
    if (attempts >= maxAttempts) clearInterval(interval);
  }, 500);

  const observer = new MutationObserver(() => {
    const items = document.querySelectorAll('.event.d-flex.border-bottom[data-region="event-item"]');
    if (items.length > 0) {
      observer.disconnect();
      clearInterval(interval);
      console.log("✅ Events detected via MutationObserver");
      startSyncIfEnabled();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 60000);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SYNC_TOGGLED_ON") {
    console.log("▶️ Sync turned ON via popup — syncing now...");
    extractAndSync();
  }
});

waitForEvents();
