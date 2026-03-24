import type { SiteLocale } from '../lib/siteLocale';

export interface FooterMapStrings {
  sectionHeading: string;
  directionsLink: string;
  stockholmSouthSwedenborg: { tooltip: string; popup: string };
  stockholmSouthRosenlund: { tooltip: string; popup: string };
  medborgarplatsenBjorn: { tooltip: string; popup: string };
  medborgarplatsenFolkungagatan: { tooltip: string; popup: string };
  mariatorget: { tooltip: string; popup: string };
}

const sv: FooterMapStrings = {
  sectionHeading: 'Karta till vår mottagning',
  directionsLink: 'Vägbeskrivning →',
  stockholmSouthSwedenborg: {
    tooltip: 'Uppgång Swedenborgsgatan',
    popup:
      '<strong>Stockholms södra</strong><br>Pendeltåg<br>Uppgång Swedenborgsgatan',
  },
  stockholmSouthRosenlund: {
    tooltip: 'Uppgång Rosenlundsgatan',
    popup:
      '<strong>Stockholms södra</strong><br>Pendeltåg<br>Uppgång Rosenlundsgatan',
  },
  medborgarplatsenBjorn: {
    tooltip: 'Uppgång Björns trädgård',
    popup:
      '<strong>Medborgarplatsen</strong><br>Tunnelbana (grön linje)<br>Uppgång Björns trädgård',
  },
  medborgarplatsenFolkungagatan: {
    tooltip: 'Uppgång Folkungagatan',
    popup:
      '<strong>Medborgarplatsen</strong><br>Uppgång Folkungagatan<br><em style="color: #16a34a;">Närmast kliniken!</em>',
  },
  mariatorget: {
    tooltip: 'Mariatorget',
    popup:
      '<strong>Mariatorget</strong><br>Tunnelbana (röd linje)<br>Uppgång Swedenborgsgatan',
  },
};

const en: FooterMapStrings = {
  sectionHeading: 'Map to our clinic',
  directionsLink: 'Directions →',
  stockholmSouthSwedenborg: {
    tooltip: 'Swedenborgsgatan exit',
    popup:
      '<strong>Stockholm Södra</strong><br>Commuter train<br>Swedenborgsgatan exit',
  },
  stockholmSouthRosenlund: {
    tooltip: 'Rosenlundsgatan exit',
    popup:
      '<strong>Stockholm Södra</strong><br>Commuter train<br>Rosenlundsgatan exit',
  },
  medborgarplatsenBjorn: {
    tooltip: 'Björns trädgård exit',
    popup:
      '<strong>Medborgarplatsen</strong><br>Metro (green line)<br>Björns trädgård exit',
  },
  medborgarplatsenFolkungagatan: {
    tooltip: 'Folkungagatan exit',
    popup:
      '<strong>Medborgarplatsen</strong><br>Folkungagatan exit<br><em style="color: #16a34a;">Closest to the clinic!</em>',
  },
  mariatorget: {
    tooltip: 'Mariatorget',
    popup:
      '<strong>Mariatorget</strong><br>Metro (red line)<br>Swedenborgsgatan exit',
  },
};

const byLocale: Partial<Record<SiteLocale, FooterMapStrings>> = {
  sv,
  en,
};

export function getFooterMapStrings(locale: SiteLocale): FooterMapStrings {
  return byLocale[locale] ?? en;
}
