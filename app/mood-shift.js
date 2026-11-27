/* Mood Shift cards and the practices each feeling points to. Gentle, not medical. */
(function(root, factory){
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FA_MOOD = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function(){
const NOTE = "A few gentle practices you could try. This isn’t a diagnosis or a treatment — just a short invitation to pause.";
const MOODS = [
  { id: "anxious", label: "Anxious", practices: [
    { kind: "lab", id: "f478", title: "4-7-8 breathing", line: "In 4 · hold 7 · out 8 · about 2½ min. A slower pattern often used when the day still feels loud." },
    { kind: "gift", id: "4-6-calming", title: "4-6 Calming Breath", line: "4s in · 6s out · a quiet pause to soften." },
    { kind: "listen", id: "breath-awareness", title: "Breath awareness", line: "With Steph Magenta · 15 min. A guided sit with the breath." }
  ], cards: [
    { type: "practice", text: "Look around and quietly name five things you can see, just as they are." },
    { type: "practice", text: "Feel your feet on the floor. Then your hands. Then one easy breath." },
    { type: "question", text: "What would a slightly softer next minute look like?" },
    { type: "original", text: "You don’t have to fix this feeling. You can sit beside it for a moment.", by: "FasciApp (original)" },
    { type: "proverb", text: "This too shall pass.", by: "traditional proverb" }
  ]},
  { id: "tired", label: "Tired", practices: [
    { kind: "gift", id: "belly-5", title: "5-5 Belly Breathing", line: "5s in · 5s out. Soft belly breaths when the body feels heavy." },
    { kind: "gift", id: "grounding-3", title: "3-3 Grounding Breath", line: "3s in · 3s out. A short way to come back to your body." },
    { kind: "listen", id: "reset-of-the-nervous-system", title: "Reset of the Nervous System", line: "Giten Tonkov, guided meditation." }
  ], cards: [
    { type: "practice", text: "A one-minute check-in: notice your feet, your hands, then your breath, without needing to change them." },
    { type: "practice", text: "Soften your shoulders on the next exhale. Then do that twice more." },
    { type: "question", text: "Where could you give yourself a little more support right now?" },
    { type: "question", text: "What could wait until you’ve had a short pause?" },
    { type: "original", text: "Rest is not a reward you have to earn.", by: "FasciApp (original)" }
  ]},
  { id: "pain", label: "In pain", practices: [
    { kind: "gift", id: "gentle-2-4", title: "2-4 Gentle Breath", line: "2s in · 4s out. A kind pace when a deep breath feels like too much." },
    { kind: "lab", id: "coherent", title: "Coherent breathing", line: "6s in · 6s out · 5 min. An even, unhurried rhythm." },
    { kind: "listen", id: "myofascial-unwinding", title: "Myofascial Unwinding", line: "Music playlist to accompany rest. Not a treatment for pain — a soft companion while you rest." }
  ], cards: [
    { type: "practice", text: "Feel the contact of your body with the chair or the floor. Stay with that contact for three easy breaths." },
    { type: "practice", text: "Look around and name five things you can see, to rest your attention somewhere steady." },
    { type: "question", text: "What would feel like a little more kindness toward your body just now?" },
    { type: "question", text: "Is there a quieter breath or a smaller movement that feels possible?" },
    { type: "original", text: "You can meet this moment gently, without asking it to disappear.", by: "FasciApp (original)" }
  ]},
  { id: "sleep", label: "Can’t sleep", practices: [
    { kind: "gift", id: "4-8-sleep", title: "Extended Exhale · 4-8", line: "4s in · 8s out. For the nightstand, when sleep won’t come." },
    { kind: "lab", id: "coherent", title: "Coherent breathing", line: "For sleep. 6s in · 6s out · 5 min." },
    { kind: "gift", id: "4-7-8", title: "4-7-8 Breathing", line: "4s in · 7s hold · 8s out. A longer exhale to wind down." }
  ], cards: [
    { type: "question", text: "What can you set down until morning?" },
    { type: "question", text: "If the night is long, what is one kind thing you can offer yourself right now?" },
    { type: "practice", text: "Let the exhale be a little longer than the inhale, three times, without forcing." },
    { type: "original", text: "Nothing here needs to be solved before you rest.", by: "FasciApp (original)" },
    { type: "proverb", text: "This too shall pass.", by: "traditional proverb" }
  ]},
  { id: "tense", label: "Angry/tense", practices: [
    { kind: "gift", id: "physiological-sigh", title: "Physiological Sigh", line: "Two gentle inhales and a long sigh. When tension sits in the chest or shoulders." },
    { kind: "gift", id: "4-6-calming", title: "4-6 Calming Breath", line: "4s in · 6s out." },
    { kind: "lab", id: "longer", title: "Longer exhale", line: "In 4 · out 6 · 5 min. For stress." }
  ], cards: [
    { type: "practice", text: "Look around and name five things you see, then feel your feet." },
    { type: "practice", text: "Let a long, easy sigh go, as if the shoulders could drop a little." },
    { type: "question", text: "What is this feeling asking you to notice, without needing an answer yet?" },
    { type: "original", text: "A feeling can be strong and still be passing through.", by: "FasciApp (original)" },
    { type: "proverb", text: "This too shall pass.", by: "traditional proverb" }
  ]},
  { id: "overwhelmed", label: "Overwhelmed", practices: [
    { kind: "gift", id: "gentle-2-4", title: "2-4 Gentle Breath", line: "When everything feels like too much, start small." },
    { kind: "gift", id: "grounding-3", title: "3-3 Grounding Breath", line: "Between things, to come back." },
    { kind: "listen", id: "reset-of-the-nervous-system", title: "Reset of the Nervous System", line: "Giten Tonkov, guided meditation." }
  ], cards: [
    { type: "original", text: "You don’t have to carry all of this at once.", by: "FasciApp (original)" },
    { type: "original", text: "One small, kind step is enough for now.", by: "FasciApp (original)" },
    { type: "practice", text: "Coming back to the body: feel your feet, your hands, then one unhurried breath." },
    { type: "practice", text: "Name five things you see, then one sound in the room." },
    { type: "question", text: "If you only did one small thing next, what would be kind enough?" }
  ]}
];
function mood(id){ return MOODS.find(m => m.id === id) || null; }
function cardAt(id, n){
  const m = mood(id);
  if (!m) return null;
  const i = ((Number(n) || 0) % m.cards.length + m.cards.length) % m.cards.length;
  return m.cards[i];
}
function isEvening(date){
  return date.getHours() >= 20;
}
function esc(s){ return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function cardHtml(card){
  if (!card) return "";
  const by = card.by ? '<small>— ' + esc(card.by) + "</small>" : "";
  const k = card.type === "question" ? "A question" : card.type === "practice" ? "A small practice" : "A line";
  return '<div class="card moodCard"><small>' + k + "</small><p>" + esc(card.text) + "</p>" + by + "</div>";
}
return { NOTE, MOODS, mood, cardAt, isEvening, cardHtml, esc };
});
