// FasciApp "What's new" card. Change "id" whenever the text changes: a new id shows the card again
// to everyone (even those who closed the old one) and lights the gold dot on the Lab tab.
//   id:     any unique text, e.g. a date
//   text:   one short line
//   button: button label (leave "" for no button)
//   tab:    tab the button opens: "learn" (Fascia Lab), "map", "list", "profile", "log"
//   breath: optional breathing practice to open in the Lab: "coherent", "longer" or "box"
// Set window.FASCIAPP_NEWS = null; to show no card.
window.FASCIAPP_NEWS = { id: "coherent-breath-2026-10-13b", text: "New in the Lab: Coherent breath. 6 in, 6 out through the nose, 5 minutes with music.", button: "Try it", tab: "learn" };

// "NEW" gold badges on Lab items. Keys: "breath:<id>" (coherent/longer/box) or a Lab item title.
// Items listed in FASCIAPP_NEWS.newItems get the badge until FASCIAPP_NEWS.newUntil (about 14 days).
// A single Lab item can also carry its own newUntil: "YYYY-MM-DD" in learn.js.
window.FASCIAPP_NEWS && (window.FASCIAPP_NEWS.newItems = ["breath:coherent", "Breath awareness"], window.FASCIAPP_NEWS.newUntil = "2026-10-27");
window.FA_isNew = function (key, until) {
  var t = Date.now(), n = window.FASCIAPP_NEWS;
  if (until && t < Date.parse(until + "T23:59:59")) return true;
  return !!(n && n.newItems && n.newItems.indexOf(key) > -1 && (!n.newUntil || t < Date.parse(n.newUntil + "T23:59:59")));
};
window.FA_NEW_TAG = '<span class="ltag new">New</span>';
