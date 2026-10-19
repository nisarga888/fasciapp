// FasciApp "What's new" card. Change "id" whenever the text changes: a new id shows the card again
// to everyone (even those who closed the old one) and lights the gold dot on the Lab tab.
//   id:     any unique text, e.g. a date
//   text:   one short line
//   button: button label (leave "" for no button)
//   tab:    tab the button opens: "learn" (Fascia Lab), "map", "list", "profile", "log"
//   breath: optional breathing practice to open in the Lab: "coherent", "longer" or "box"
//   v0.23.101 rich card (optional): label (small gold line), title (big line), image (path or URL),
//   play: true (play icon on the image), tile: short text in a gold tile instead of an image (e.g. "7"), url (button opens this link in a new tab instead of a tab).
// Set window.FASCIAPP_NEWS = null; to show no card.
window.FASCIAPP_NEWS = { id: "first-7-days-2026-10-19", label: "First 7 days", title: "FasciApp is 7 days old 🎉", text: "125+ practitioners joined in our first 7 days. Thank you!", button: "See our first week", url: "https://www.instagram.com/reel/DerToiwxIVX/" };
// previous: { id: "coherent-breath-2026-10-13b", text: "New in the Lab: Coherent breath. 6 in, 6 out through the nose, 5 minutes with music.", button: "Try it", tab: "learn" }

// "NEW" gold badges on Lab items. Keys: "breath:<id>" (coherent/longer/box) or a Lab item title.
// The item the banner features gets the badge automatically: set FASCIAPP_NEWS.item (a key above),
// or FASCIAPP_NEWS.breath ("coherent" etc.). It shows until FASCIAPP_NEWS.newUntil (about 14 days).
// A single Lab item can also carry its own newUntil: "YYYY-MM-DD" in learn.js.
window.FASCIAPP_NEWS && !window.FASCIAPP_NEWS.url && (window.FASCIAPP_NEWS.item = "breath:coherent", window.FASCIAPP_NEWS.newUntil = "2026-10-27");
window.FA_isNew = function (key, until) {
  var t = Date.now(), n = window.FASCIAPP_NEWS;
  if (until && t < Date.parse(until + "T23:59:59")) return true;
  var k = n && (n.item || (n.breath ? "breath:" + n.breath : ""));
  return !!(k && k === key && (!n.newUntil || t < Date.parse(n.newUntil + "T23:59:59")));
};
window.FA_NEW_TAG = '<span class="ltag new">New</span>';

// Instagram follow chip (List header + Lab). Update igFollowers by hand; null hides the count.
// Count hidden at Nisarga's request (14 Oct 2026: public profile showed 57).
window.FASCIAPP_SOCIAL = { igHandle: "fasciapp.app", igUrl: "https://www.instagram.com/fasciapp.app/", igFollowers: null };
(function () {
  function chip() {
    var s = window.FASCIAPP_SOCIAL; if (!s) return "";
    var n = s.igFollowers, c = typeof n === "number" ? '<span class="igN">' + n + (n === 1 ? " follower" : " followers") + "</span>" : "";
    return '<a class="igChip" href="' + s.igUrl + '" target="_blank" rel="noopener" aria-label="Follow @' + s.igHandle + ' on Instagram">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>' +
      '<b>@' + s.igHandle + "</b>" + c + '<span class="igF">Follow</span></a>' + '<a class="fbChip" href="https://www.facebook.com/share/1EuP1W8X2Q/" target="_blank" rel="noopener" aria-label="Follow FasciApp on Facebook"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.6-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.5H8v3h2.5V21z"/></svg></a>';
  }
  function mount() {
    // Lab: small round icons right-aligned on the "Fascia Lab" title row (below the quote)
    var h = document.querySelector("#learnH"); if (!h || h.parentNode.classList.contains("hRow")) return;
    var w = document.createElement("div"); w.className = "hRow labH"; h.parentNode.insertBefore(w, h); w.appendChild(h); w.insertAdjacentHTML("beforeend", '<span class="socRow socMini">' + chip() + "</span>");
    // line the icons' right edge up with the right edge of the intro text's longest line
    var al = function () { var pp = document.querySelector("#learn p.muted"), so = w.querySelector(".socMini"); if (!pp || !so || !pp.offsetWidth) return; var rg = document.createRange(); rg.selectNodeContents(pp); var m = 0; [].forEach.call(rg.getClientRects(), function (r) { m = Math.max(m, r.right) }); if (m) so.style.marginRight = Math.max(0, Math.round(pp.getBoundingClientRect().right - m)) + "px" };
    window.addEventListener("resize", al); new MutationObserver(al).observe(document.getElementById("learn"), { attributes: true, attributeFilter: ["class", "hidden", "style"] }); setTimeout(al, 0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
