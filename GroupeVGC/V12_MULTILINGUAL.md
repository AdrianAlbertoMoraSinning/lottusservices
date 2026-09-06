# Groupe VGC — V12 Multilingual

## Scope
This release adds a global FR / EN / ES language selector to the complete current portal.

## Behaviour
- French remains the default language.
- The visitor can switch instantly to English or Spanish.
- The selected language persists across pages using browser localStorage.
- `<html lang>` and supported page titles / metadata are updated with the selected language.
- Public navigation, service/rates pages, booking flow, confirmation, contact, reviews, payment/invoice screens and administration UI are covered.
- Default service names/descriptions and dynamic booking messages are translated.
- Database values used by Supabase remain canonical and are not translated, preventing multilingual UI labels from changing booking, job, invoice or payment status values.

## Main implementation
- New: `i18n.js`
- Updated: all HTML screens to load the global language engine.
- Updated: `style.css` for the language selector.
- Updated: `booking-app.js` so CAD formatting follows the selected locale.
- Updated: `modules/agenda/admin.js` so translated option labels keep canonical database values.

## Important content rule
Free-form content created later by an administrator or imported from a third party is not automatically machine-translated. Add approved EN/ES wording to the localization dictionary when new permanent portal content is introduced.
