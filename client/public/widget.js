(function(){
  var script = document.currentScript;
  var slug = script && script.getAttribute("data-slug");
  if (!slug) { console.error("FeedbackForge widget: missing data-slug attribute"); return; }
  var src = script.getAttribute("src") || "";
  var base = src.replace(/\/widget\.js(\?.*)?$/, "");
  var API = base + "/api/widget/" + slug + "/submit";

  var s = document.createElement("style");
  s.textContent = [
    ".ff-trigger{position:fixed;bottom:24px;right:24px;z-index:99999;width:52px;height:52px;border-radius:50%;background:#7c3aed;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(124,58,237,.4);transition:box-shadow .2s}",
    ".ff-trigger:hover{box-shadow:0 6px 20px rgba(124,58,237,.5)}",
    ".ff-trigger svg{width:24px;height:24px}",
    ".ff-overlay{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.4);opacity:0;transition:opacity .2s;pointer-events:none}",
    ".ff-overlay.ff-show{opacity:1;pointer-events:auto}",
    ".ff-modal{position:fixed;bottom:88px;right:24px;z-index:99999;width:380px;max-width:calc(100vw - 48px);background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.2);transform:translateY(16px) scale(.95);opacity:0;transition:transform .25s,opacity .25s;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
    ".ff-modal.ff-show{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}",
    ".ff-header{padding:20px 20px 0;display:flex;align-items:center;justify-content:space-between}",
    ".ff-header h3{margin:0;font-size:16px;font-weight:600;color:#1a1a2e}",
    ".ff-close{background:none;border:none;cursor:pointer;color:#9ca3af;font-size:20px;padding:4px;line-height:1}",
    ".ff-body{padding:16px 20px 20px}",
    ".ff-field{margin-bottom:14px}",
    ".ff-label{display:block;font-size:13px;font-weight:500;color:#4b5563;margin-bottom:6px}",
    ".ff-stars{display:flex;gap:4px}",
    ".ff-star{background:none;border:none;cursor:pointer;padding:2px;font-size:0;line-height:0}",
    ".ff-star svg{width:28px;height:28px;transition:color .15s,fill .15s}",
    ".ff-star .off{fill:none;stroke:#d1d5db;stroke-width:1.5}",
    ".ff-star .on{fill:#f59e0b;stroke:#f59e0b;stroke-width:1.5}",
    ".ff-select,.ff-textarea,.ff-input{width:100%;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;color:#1a1a2e;background:#fff;outline:none;box-sizing:border-box;transition:border-color .15s}",
    ".ff-select:focus,.ff-textarea:focus,.ff-input:focus{border-color:#7c3aed}",
    ".ff-textarea{resize:vertical;min-height:80px;font-family:inherit}",
    ".ff-submit{width:100%;padding:10px;border:none;border-radius:8px;background:#7c3aed;color:#fff;font-size:14px;font-weight:500;cursor:pointer;transition:opacity .15s}",
    ".ff-submit:hover{opacity:.9}",
    ".ff-submit:disabled{opacity:.6;cursor:not-allowed}",
    ".ff-success{text-align:center;padding:32px 20px}",
    ".ff-success svg{width:48px;height:48px;color:#10b981;margin:0 auto 12px}",
    ".ff-success p{margin:0;font-size:15px;color:#4b5563}",
    ".ff-success strong{display:block;font-size:17px;color:#1a1a2e;margin-bottom:4px}",
    "@media(prefers-color-scheme:dark){",
    "  .ff-modal{background:#1e1e2e;box-shadow:0 20px 60px rgba(0,0,0,.5)}",
    "  .ff-header h3,.ff-success strong{color:#f1f5f9}",
    "  .ff-label{color:#94a3b8}",
    "  .ff-select,.ff-textarea,.ff-input{background:#2a2a3e;border-color:#3f3f5e;color:#f1f5f9}",
    "  .ff-select:focus,.ff-textarea:focus,.ff-input:focus{border-color:#7c3aed}",
    "  .ff-star .off{stroke:#4b5563}",
    "  .ff-success p{color:#94a3b8}",
    "  .ff-close{color:#6b7280}",
    "}"
  ].join("\n");
  document.head.appendChild(s);

  var starSvg = '<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>';

  var btn = document.createElement("button");
  btn.className = "ff-trigger";
  btn.setAttribute("aria-label", "Send feedback");
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(btn);

  var ov = document.createElement("div");
  ov.className = "ff-overlay";
  document.body.appendChild(ov);

  var m = document.createElement("div");
  m.className = "ff-modal";
  m.innerHTML = '<div class="ff-header"><h3>Send Feedback</h3><button class="ff-close" aria-label="Close">&times;</button></div>'
    + '<div class="ff-body">'
    + '<div class="ff-field"><label class="ff-label">Rating</label><div class="ff-stars" id="ff-stars"></div></div>'
    + '<div class="ff-field"><label class="ff-label">Category</label><select class="ff-select" id="ff-cat"><option value="">Select...</option><option value="Bug">Bug</option><option value="Feature">Feature</option><option value="Idea">Idea</option><option value="Other">Other</option></select></div>'
    + '<div class="ff-field"><label class="ff-label">Message</label><textarea class="ff-textarea" id="ff-msg" placeholder="Tell us what you think..."></textarea></div>'
    + '<div class="ff-field"><label class="ff-label">Name (optional)</label><input class="ff-input" id="ff-name" placeholder="Your name"/></div>'
    + '<button class="ff-submit" id="ff-sub">Submit Feedback</button>'
    + '</div>';
  document.body.appendChild(m);

  var rating = 0;
  var starsEl = m.querySelector("#ff-stars");
  for (var i = 1; i <= 5; i++) {
    (function(v) {
      var b = document.createElement("button");
      b.className = "ff-star";
      b.innerHTML = starSvg;
      b.querySelector("path").classList.add("off");
      b.onclick = function() { rating = v; updateStars(); };
      starsEl.appendChild(b);
    })(i);
  }

  function updateStars() {
    var bs = starsEl.querySelectorAll(".ff-star path");
    for (var j = 0; j < bs.length; j++) {
      bs[j].classList.remove("on", "off");
      bs[j].classList.add(j < rating ? "on" : "off");
    }
  }

  function toggle(show) {
    m.classList.toggle("ff-show", show);
    ov.classList.toggle("ff-show", show);
  }

  btn.onclick = function() { toggle(true); };
  ov.onclick = function() { toggle(false); };
  m.querySelector(".ff-close").onclick = function() { toggle(false); };

  m.querySelector("#ff-sub").onclick = function() {
    var cat = m.querySelector("#ff-cat").value;
    var msg = m.querySelector("#ff-msg").value;
    var name = m.querySelector("#ff-name").value;
    if (!rating || !cat || !msg) { alert("Please fill in rating, category, and message."); return; }
    var sub = m.querySelector("#ff-sub");
    sub.disabled = true;
    sub.textContent = "Sending...";
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: rating, category: cat, message: msg, name: name || undefined })
    })
    .then(function(r) { if (!r.ok) throw new Error(); return r.json(); })
    .then(function() {
      m.querySelector(".ff-body").innerHTML = '<div class="ff-success"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg><strong>Thank you!</strong><p>Your feedback has been received.</p></div>';
      setTimeout(function() { toggle(false); }, 2500);
    })
    .catch(function() {
      sub.disabled = false;
      sub.textContent = "Submit Feedback";
      alert("Something went wrong. Please try again.");
    });
  };
})();
