// FasciApp "Fascia Lab" content. Edit this list to add or change videos and ebooks.
// Each item:
//   section:     heading the card is grouped under, e.g. "Videos" or "Ebooks" (new names make new sections)
//   title:       card title
//   by:          author line (optional)
//   line:        one short line under the title (optional)
//   type:        "youtube" or "pdf"
//   youtubeId:   for videos: the YouTube link or its 11-character ID (youtu.be/XXXX or watch?v=XXXX)
//   url:         for PDFs: full https link, or a file placed in app/learn/ (e.g. "learn/breathe.pdf")
//   cover:       optional image (https link or "learn/cover.jpg"); videos use the YouTube thumbnail automatically
//   public:      true = open to everyone; false = locked, opens only after sign-in
// An item with no youtubeId / url shows as "Coming soon".
window.FASCIAPP_LEARN = [
  { section: "Videos", title: "MER video", line: "An introduction to Myofascial Energetic Release.", type: "youtube", youtubeId: "", public: true },
  { section: "Videos", title: "BBTRS video", line: "An introduction to Biodynamic Breathwork.", type: "youtube", youtubeId: "", public: false },
  { section: "Ebooks", title: "Breathe for Stress and Sleep", by: "Nisarga Eryk Dobosz", line: "21 gentle days of breathwork. PDF download.", type: "pdf", url: "", public: false },
  { section: "Ebooks", title: "Feel2Heal", by: "Giten Tonkov", line: "PDF download.", type: "pdf", url: "", public: false }
];
