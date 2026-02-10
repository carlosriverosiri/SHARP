type ResponseDom = {
  statusEl: HTMLElement | null;
  durationEl: HTMLElement | null;
  contentEl: HTMLElement | null;
  accordionEl: HTMLElement | null;
  titleEl: HTMLElement | null;
};

type SynthesisDom = {
  synthesisCard: HTMLElement | null;
  synthesisDurationEl: HTMLElement | null;
  synthesisContentEl: HTMLElement | null;
  synthesisModelLabelEl: HTMLElement | null;
};

type CostDom = {
  costContainer: HTMLElement | null;
  costEl: HTMLElement | null;
  detailsEl: HTMLElement | null;
  costBanner: HTMLElement | null;
  amountEl: HTMLElement | null;
  sekEl: HTMLElement | null;
  timeEl: HTMLElement | null;
  tokensInEl: HTMLElement | null;
  tokensOutEl: HTMLElement | null;
};

type TotalsDom = {
  totalDurationEl: HTMLElement | null;
};

type HallucinationDom = {
  reportEl: HTMLElement | null;
  highEl: HTMLElement | null;
  mediumEl: HTMLElement | null;
  lowEl: HTMLElement | null;
  statusEl: HTMLElement | null;
  detailsSection: HTMLElement | null;
  listEl: HTMLElement | null;
};

export function getResponseDom(provider: string): ResponseDom {
  const accordionEl = document.getElementById('accordion-' + provider);
  return {
    statusEl: document.getElementById('status-' + provider),
    durationEl: document.getElementById('duration-' + provider),
    contentEl: document.getElementById('content-' + provider),
    accordionEl,
    titleEl: accordionEl?.querySelector('.accordion-title') as HTMLElement | null
  };
}

export function getSynthesisDom(): SynthesisDom {
  return {
    synthesisCard: document.getElementById('synthesisCard'),
    synthesisDurationEl: document.getElementById('synthesisDuration'),
    synthesisContentEl: document.getElementById('synthesisContent'),
    synthesisModelLabelEl: document.getElementById('synthesisModelLabel')
  };
}

type AccordionDom = {
  accordionEl: HTMLElement | null;
  statusEl: HTMLElement | null;
  durationEl: HTMLElement | null;
  contentEl: HTMLElement | null;
  markdownEl: HTMLElement | null;
  r2AccordionEl: HTMLElement | null;
  r2StatusEl: HTMLElement | null;
  r2DurationEl: HTMLElement | null;
  r2ContentEl: HTMLElement | null;
  r2MarkdownEl: HTMLElement | null;
};

export function getAccordionDom(provider: string): AccordionDom {
  const accordionEl = document.getElementById('accordion-' + provider);
  const contentEl = document.getElementById('content-' + provider);
  const r2AccordionEl = document.getElementById('accordion-r2-' + provider);
  const r2ContentEl = document.getElementById('content-r2-' + provider);

  return {
    accordionEl,
    statusEl: document.getElementById('status-' + provider),
    durationEl: document.getElementById('duration-' + provider),
    contentEl,
    markdownEl: contentEl?.querySelector('.markdown-content') as HTMLElement | null,
    r2AccordionEl,
    r2StatusEl: document.getElementById('status-r2-' + provider),
    r2DurationEl: document.getElementById('duration-r2-' + provider),
    r2ContentEl,
    r2MarkdownEl: r2ContentEl?.querySelector('.markdown-content') as HTMLElement | null
  };
}

export function getCostDom(): CostDom {
  return {
    costContainer: document.getElementById('totalCostContainer'),
    costEl: document.getElementById('totalCost'),
    detailsEl: document.getElementById('costDetails'),
    costBanner: document.getElementById('costBanner'),
    amountEl: document.getElementById('costBannerAmount'),
    sekEl: document.getElementById('costBannerSek'),
    timeEl: document.getElementById('costBannerTime'),
    tokensInEl: document.getElementById('costBannerTokensIn'),
    tokensOutEl: document.getElementById('costBannerTokensOut')
  };
}

export function getTotalsDom(): TotalsDom {
  return {
    totalDurationEl: document.getElementById('totalDuration')
  };
}

export function getHallucinationDom(): HallucinationDom {
  return {
    reportEl: document.getElementById('hallucinationReport'),
    highEl: document.getElementById('hallucinationHigh'),
    mediumEl: document.getElementById('hallucinationMedium'),
    lowEl: document.getElementById('hallucinationLow'),
    statusEl: document.getElementById('hallucinationStatus'),
    detailsSection: document.getElementById('hallucinationDetails'),
    listEl: document.getElementById('hallucinationList')
  };
}
