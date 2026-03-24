import type { SiteLocale } from '../lib/siteLocale';

export interface FooterLink {
  href: string;
  label: string;
}

export interface FooterStrings {
  ctaTitle: string;
  ctaSubtitle: string;
  ctaBook: string;
  ctaSelfReferral: string;
  ctaBookHref: string;
  ctaSelfReferralHref: string;
  srOnlyFooter: string;
  contactHeading: string;
  phoneHours: string;
  faxLabel: string;
  clinicNameHeading: string;
  visitAddressLabel: string;
  visitAddressNote: string;
  postalAddressLabel: string;
  patientHeading: string;
  patientLinks: FooterLink[];
  linksHeading: string;
  navLinks: FooterLink[];
  copyright: string;
}

const sv: FooterStrings = {
  ctaTitle: 'Behöver du en bedömning?',
  ctaSubtitle: 'Boka tid hos Dr. Carlos Rivero Siri vid axelnervsmärta.',
  ctaBook: 'Boka tid',
  ctaSelfReferral: 'Egenremiss',
  ctaBookHref: '/boka',
  ctaSelfReferralHref: '/egenremiss',
  srOnlyFooter: 'Sidfot',
  contactHeading: 'Kontakt',
  phoneHours: 'Telefontid: Mån–Fre 08–16 (lunchstängt)',
  faxLabel: 'Fax:',
  clinicNameHeading: 'Södermalms Ortopedi',
  visitAddressLabel: 'Besöksadress:',
  visitAddressNote: 'Egen ingång från utsidan.',
  postalAddressLabel: 'Postadress:',
  patientHeading: 'Patient',
  patientLinks: [
    { href: '/privatpatient-tre-val', label: 'Frågeformulär (Privat)' },
    { href: '/fritt-vardval-sverige', label: 'Fritt Vårdval' },
    { href: '/patientavgifter', label: 'Patientavgifter' },
    { href: '/patient/forsakringar-betalning', label: 'Försäkringsbolag' },
  ],
  linksHeading: 'Länkar',
  navLinks: [
    { href: '/rehab', label: 'Rehabprogram' },
    { href: '/patientinformation', label: 'Patientinformation' },
    { href: '/om-oss', label: 'Om oss' },
  ],
  copyright: '© {year} Södermalms Ortopedi. Alla rättigheter förbehållna.',
};

const en: FooterStrings = {
  ctaTitle: 'Need expert assessment?',
  ctaSubtitle: 'Book a consultation with Dr. Carlos Rivero Siri for shoulder nerve pain.',
  ctaBook: 'Book appointment',
  ctaSelfReferral: 'Self-referral',
  ctaBookHref: '/boka',
  ctaSelfReferralHref: '/egenremiss',
  srOnlyFooter: 'Footer',
  contactHeading: 'Contact',
  phoneHours: 'Phone hours: Mon–Fri 08:00–16:00 (closed for lunch)',
  faxLabel: 'Fax:',
  clinicNameHeading: 'Södermalms Ortopedi',
  visitAddressLabel: 'Visiting address:',
  visitAddressNote: 'Separate entrance from the street.',
  postalAddressLabel: 'Postal address:',
  patientHeading: 'Patients',
  patientLinks: [
    { href: '/privatpatient-tre-val', label: 'Questionnaire (private)' },
    { href: '/fritt-vardval-sverige', label: 'Free choice of care (Sweden)' },
    { href: '/patientavgifter', label: 'Patient fees' },
    { href: '/patient/forsakringar-betalning', label: 'Insurance companies' },
  ],
  linksHeading: 'Links',
  navLinks: [
    { href: '/en/rehab', label: 'Rehabilitation programmes' },
    { href: '/patientinformation', label: 'Patient information' },
    { href: '/om-oss', label: 'About us' },
  ],
  copyright: '© {year} Södermalms Ortopedi. All rights reserved.',
};

const byLocale: Partial<Record<SiteLocale, FooterStrings>> = {
  sv,
  en,
};

/**
 * Spanish (and other future locales): add a full `es` object above and register it in `byLocale`.
 * Until then, `/es/*` pages fall back to English footer copy so text matches a Latin-script locale.
 */
export function getFooterStrings(locale: SiteLocale): FooterStrings {
  return byLocale[locale] ?? en;
}
