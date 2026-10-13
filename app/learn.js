// FasciApp "Fascia Lab" content. Edit this list to add or change videos and ebooks.
// Each item:
//   section:     heading the card is grouped under, e.g. "Videos" or "Ebooks" (new names make new sections)
//   title:       card title
//   by:          author line (optional)
//   line:        one short line under the title (optional)
//   type:        "youtube", "pdf" or "link" (link = external page, e.g. a sign-up page; button text from "cta")
//   youtubeId:   for videos: the YouTube link or its 11-character ID (youtu.be/XXXX or watch?v=XXXX)
//   url:         for PDFs: full https link, or a file placed in app/learn/ (e.g. "learn/breathe.pdf")
//   cover:       optional image (https link or "learn/cover.jpg"); videos use the YouTube thumbnail automatically
//   public:      true = open to everyone; false = locked, opens only after sign-in
// An item with no youtubeId / url shows as "Coming soon".
// Videos verified via YouTube oEmbed on 11 Oct 2026 (embeddable). "title" = YouTube title as given (bold-Unicode letters shown as plain text).
window.FASCIAPP_LEARN = [
  { section: "Myofascial Energetic Release Videos", title: "Myofascial Energetic Release Training With founder Satyarthi Peloquin", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER · 2:46", type: "youtube", youtubeId: "crpUWY3Bi5M", public: true },
  { section: "Myofascial Energetic Release Videos", title: "Myofascial Energetic Release: Revolutionary New Elements", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER · 7:31", type: "youtube", youtubeId: "7b0ziT10Zpw", public: false },
  { section: "Myofascial Energetic Release Videos", title: "Psoas Release for Low Back Pain | Myofascial Energetic Release Demo with Satyarthi Peloquin", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER demo · 6:19", type: "youtube", youtubeId: "b4vg4Y_yIMw", public: false },
  { section: "Myofascial Energetic Release Videos", title: "Thoracic Inlet Release | MER Neck, Chest & Shoulder Work with Nisarga", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER demo", type: "youtube", youtubeId: "4-n7xL18Ddw", public: false },
  // (hidden for now, open later) { section: "Myofascial Energetic Release Videos", title: "Plantar Fascia Release | MER Foot and Arch Release with Nisarga", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER demo", type: "youtube", youtubeId: "q-o-U-SzuEw", public: false },
  // (hidden for now, open later) { section: "Myofascial Energetic Release Videos", title: "How to Release Lower Back Pain with MYOFASCIAL ENERGETIC RELEASE | Demo with Ketu", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER demo", type: "youtube", youtubeId: "j1-I-h9c4MM", public: false },
  // (hidden for now, open later) { section: "Myofascial Energetic Release Videos", title: "Fluid Body in MER | Hip Joint & SI Joint Release with Roland Engelbracht", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER demo", type: "youtube", youtubeId: "XFps40qbJOM", public: false },
  // (hidden for now, open later) { section: "Myofascial Energetic Release Videos", title: "How We Release Shoulder Tension | Myofascial Energetic Release with Ulla Thordal", by: "Myofascial Energetic Release by Satyarthi Peloquin", line: "MER demo", type: "youtube", youtubeId: "F3Xnc4h7-QY", public: false },
  { section: "Biodynamic Breathwork Videos", title: "Discover the Power of BBTRS®: Explained by Founder Giten Tonkov", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS · 3:14", type: "youtube", youtubeId: "OG9VhxyYjOY", public: true },
  { section: "Biodynamic Breathwork Videos", title: "Introduction to BioDynamic Breathwork & Trauma Release System.", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS · 3:11", type: "youtube", youtubeId: "JcWmW2VZ5FU", public: false },
  { section: "Biodynamic Breathwork Videos", title: "Biodynamic Breathwork (BBTRS)-Home practice demo with founder Giten Tonkov", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS home practice · 21:27", type: "youtube", youtubeId: "_XN7MuIcOls", public: false },
  { section: "Biodynamic Breathwork Videos", title: "Exploring Resonance & Attunement in Breathwork | Demonstration with Nisarga Eryk Dobosz", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS demo", type: "youtube", youtubeId: "yVBOq8ru52M", public: false },
  // (hidden for now, open later) { section: "Biodynamic Breathwork Videos", title: "Jaw & Throat Tension Release | BBTRS Session Demo with Prema McKeever", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS demo", type: "youtube", youtubeId: "soEAZ2gLMOw", public: false },
  // (hidden for now, open later) { section: "Biodynamic Breathwork Videos", title: "Deep Healing in Action: Watch Resonance Unfold! | Part 2", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS demo", type: "youtube", youtubeId: "iHjWLpDEILs", public: false },
  // (hidden for now, open later) { section: "Biodynamic Breathwork Videos", title: "Heart-Centered Thoracic Tension Release | Demonstration with Nisarga Eryk Dobosz", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS demo", type: "youtube", youtubeId: "PVerAkNgIX4", public: false },
  // (hidden for now, open later) { section: "Biodynamic Breathwork Videos", title: "Trauma-Informed Breathwork Training for Practitioners | BBTRS® Certification", by: "Biodynamic Breathwork Trauma Release Institute", line: "BBTRS training", type: "youtube", youtubeId: "pK4PmXlQmpw", public: false },
  // Fascia & anatomy (oEmbed-checked 11 Oct 2026; 6 others requested were not embeddable and are left out)
  // (hidden for now, Nisarga 11 Oct: focus on MER and BBTRS) { section: "Fascia & anatomy", title: "Strolling under the Skin", by: "UKyOrtho", line: "Fascia & anatomy", type: "youtube", youtubeId: "eW0lvOVKDxE", public: true },
  { section: "Books", title: "Feel to Heal", by: "Giten Tonkov", line: "Book · releasing trauma through body awareness and breathwork", type: "pdf", url: "lab/feel-to-heal.pdf", cover: "lab/feel-to-heal-cover.jpg?v=2", public: false },
  { section: "Books", title: "The Issue Lives in the Tissue", by: "Nisarga Eryk Dobosz", line: "Free trauma release ebook · PDF download", type: "pdf", url: "lab/issue-lives-in-the-tissue.pdf", cover: "lab/issue-lives-in-the-tissue-cover.jpg", public: false },
  { section: "Books", title: "Blog", by: "Nisarga Eryk Dobosz", line: "Articles and resources on body, breath and healing", type: "link", cta: "Open blog", url: "https://www.nisarga8.com/resources", cover: "lab/blog-cover.webp", public: true },
  // Free live sessions: official pages, checked 11 Oct 2026
  { section: "Listen", title: "Reset of the Nervous System", by: "Giten Tonkov", line: "Guided meditation", type: "link", cta: "Listen", url: "https://open.spotify.com/playlist/3G1i9jdirrgDYO1LUTRurK", cover: "lab/reset-ns.jpg", public: false },
  { section: "Listen", title: "Huberman Lab", by: "Andrew Huberman · Scicomm Media", line: "Science-based tools for health", type: "link", cta: "Listen", url: "https://open.spotify.com/show/79CkJF3UJTHFV8Dse3Oy0P", cover: "lab/pod2.jpg", public: false },
  { section: "Listen", title: "MER Massage", by: "Spotify playlist", line: "Music for MER sessions", type: "link", cta: "Listen", url: "https://open.spotify.com/playlist/371wxYT1vP4OtXmzEAiizl", cover: "lab/pl1.jpg", public: false },
  // (hidden for now) { section: "Listen", title: "Unwinding Music", by: "Spotify playlist", line: "Music for unwinding", type: "link", cta: "Listen", url: "https://open.spotify.com/playlist/4qv2KYS1OdfSRZdSVfa2JY", cover: "lab/pl2.jpg", public: true },
  { section: "Listen", title: "Holistic Health Podcast", by: "Integral Body Institute · hosted by Nisarga", line: "Podcast on holistic health", type: "link", cta: "Listen", url: "https://open.spotify.com/show/4lR779uey3udxNu6a4wClc", cover: "lab/pod1.jpg", public: false },
  { section: "Free live sessions", title: "Free online breathwork", by: "BBTRS® · Biodynamic Breathwork", line: "Free online community sessions, twice a month.", type: "link", cta: "Sign up", url: "https://biodynamicbreath.com/find-breathwork-training", public: true },
  { section: "Free live sessions", title: "Free Sunday meditations", by: "MER® · Myofascial Energetic Release", line: "Free online group session, every Sunday.", type: "link", cta: "Sign up", url: "https://www.myofascialtrainings.com/online-courses/group-sessions", public: true }
];
