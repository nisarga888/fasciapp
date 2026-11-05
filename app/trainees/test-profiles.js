/* TEST placeholders for the BBTRS trainee directory.
   These four rows are not real people. They use no real biography, location,
   language, cohort date, credential, WhatsApp number, or email address.
   The solid-color image is a layout placeholder, not a photograph.
   The same rows are in supabase/migrations/20261105163100_bbtrs_trainees_test_seed.sql.
   That seed does not create auth accounts or passwords. */
(function (factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.FA_TR_TEST = api;
})(function () {
  const BIO = "TEST profile. Placeholder text only. Not a real biography or credential.";
  const rows = [
    {id: "11111111-1111-4111-8111-111111111101", is_test: true, published: true, name: "Nisarga", bio: BIO, photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQkAAAgEsGtkIouY3gi+hcEKLNXzWgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELgunAmDxqz5UIwAAAABJRU5ErkJggg==", website: "https://example.com", country: "TEST", languages: ["TEST"], cohort_month: null, cohort_year: null, cohort_label: "TEST", has_email: true, has_whatsapp: false},
    {id: "11111111-1111-4111-8111-111111111102", is_test: true, published: true, name: "Giten", bio: BIO, photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PQQkAAAgEsEthPd/2L2AE38JgBZaafi0CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApcFPiXgxO/vtJwAAAAASUVORK5CYII=", website: "https://example.com", country: "TEST", languages: ["TEST"], cohort_month: null, cohort_year: null, cohort_label: "TEST", has_email: true, has_whatsapp: false},
    {id: "11111111-1111-4111-8111-111111111103", is_test: true, published: true, name: "Aisha", bio: BIO, photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQkAAAgEsAtmCOMY3wi+hcEKLNP1WgQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQELgvqPkDxBANEKQAAAABJRU5ErkJggg==", website: "https://example.com", country: "TEST", languages: ["TEST"], cohort_month: null, cohort_year: null, cohort_label: "TEST", has_email: true, has_whatsapp: false},
    {id: "11111111-1111-4111-8111-111111111104", is_test: true, published: true, name: "Prema", bio: BIO, photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAUElEQVR42u3PQQkAAAgEsGvm3xD2j2EE38JgBZaueS0CAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApcFWe9w01uHf3MAAAAASUVORK5CYII=", website: "https://example.com", country: "TEST", languages: ["TEST"], cohort_month: null, cohort_year: null, cohort_label: "TEST", has_email: true, has_whatsapp: false}
  ];
  return rows;
});
