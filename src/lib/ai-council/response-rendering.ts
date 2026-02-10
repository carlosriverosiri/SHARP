import type { CurrentResponses, ModelResponse, CostInfo } from './types';
import { getModelDisplayName } from '../ai-core/model-mapping';
import { formatCostForLocale } from '../ai-core/currency';
import { getCostDom, getHallucinationDom, getResponseDom, getSynthesisDom } from './response-dom';

type ResponseRenderingOptions = {
  renderMarkdown: (text: string) => string;
  formatDuration: (duration?: number) => string;
  updateSynthesisMeta: (modelsUsed: string[]) => void;
  getCurrentResponses: () => CurrentResponses | any;
  refreshAccordionHeight?: (accordion: HTMLElement | null) => void;
};

export function initResponseRendering({
  renderMarkdown,
  formatDuration,
  updateSynthesisMeta,
  getCurrentResponses,
  refreshAccordionHeight
}: ResponseRenderingOptions) {
  function displayResponse(provider: string, data: ModelResponse) {
    const { statusEl, durationEl, contentEl, accordionEl, titleEl } = getResponseDom(provider);
    const markdownEl = contentEl?.querySelector('.markdown-content');

    const currentResponses = getCurrentResponses();
    if (currentResponses) {
      currentResponses[provider] = data.response || '';
    }

    if (titleEl && data.model) {
      titleEl.textContent = getModelDisplayName(data.model);
    }

    if (statusEl) statusEl.classList.remove('waiting');

    if (data.error) {
      if (statusEl) {
        statusEl.textContent = '❌';
        statusEl.classList.remove('success');
        statusEl.classList.add('error');
      }
      if (markdownEl) markdownEl.innerHTML = '<p style="color:#f87171;">' + data.error + '</p>';
    } else {
      if (statusEl) {
        statusEl.textContent = '✓';
        statusEl.classList.remove('error');
        statusEl.classList.add('success');
      }
    if (markdownEl) markdownEl.innerHTML = renderMarkdown(data.response || '');
    }
    if (refreshAccordionHeight) {
      refreshAccordionHeight(accordionEl as HTMLElement | null);
    }

    let durationText = formatDuration(data.duration);
    if (data.cost && data.cost.totalCost && data.cost.totalCost > 0) {
      const lang = document.documentElement.lang;
      const costText = formatCostForLocale(data.cost.totalCost, lang);
      durationText += ` · ${costText.primary}`;
    }
    if (durationEl) durationEl.textContent = durationText;
  }

  function renderSynthesis(synthesis: ModelResponse, modelsUsed: string[]) {
    if (!synthesis) return;
    const {
      synthesisCard,
      synthesisDurationEl,
      synthesisContentEl,
      synthesisModelLabelEl
    } = getSynthesisDom();

    if (synthesisCard) synthesisCard.style.display = 'block';

    let synthDuration = formatDuration(synthesis.duration);
    if (synthesis.cost && synthesis.cost.totalCost && synthesis.cost.totalCost > 0) {
      const lang = document.documentElement.lang;
      const costText = formatCostForLocale(synthesis.cost.totalCost, lang);
      synthDuration += ` · ${costText.primary}`;
    }
    if (synthesisDurationEl) synthesisDurationEl.textContent = synthDuration;
    if (synthesisContentEl) synthesisContentEl.innerHTML = renderMarkdown(synthesis.response || '');
    if (synthesisModelLabelEl) synthesisModelLabelEl.textContent = synthesis.provider || '';

    if (modelsUsed && modelsUsed.length > 0) {
      updateSynthesisMeta(modelsUsed);
    }
  }

  function renderCostBanner(totalCost: CostInfo | null, totalDuration: number) {
    if (!totalCost || !totalCost.totalCostUSD || totalCost.totalCostUSD <= 0) return;

    const {
      costContainer,
      costEl,
      detailsEl,
      costBanner,
      amountEl,
      sekEl,
      timeEl,
      tokensInEl,
      tokensOutEl
    } = getCostDom();

    const usdCost = totalCost.totalCostUSD;
    const lang = document.documentElement.lang;
    const costText = formatCostForLocale(usdCost, lang);

    if (costEl) {
      const secondary = costText.secondary ? ` ${costText.secondary}` : '';
      costEl.textContent = `${costText.primary}${secondary}`;
    }
    const inputTokens = totalCost.inputTokens || 0;
    const outputTokens = totalCost.outputTokens || 0;
    if (detailsEl) detailsEl.textContent = `${inputTokens.toLocaleString()} in / ${outputTokens.toLocaleString()} ut tokens`;
    if (costContainer) costContainer.style.display = 'block';

    if (costBanner) {
      if (amountEl) amountEl.textContent = costText.primary;
      if (sekEl) sekEl.textContent = costText.secondary || '';
      if (timeEl) timeEl.textContent = formatDuration(totalDuration);
      if (tokensInEl) tokensInEl.textContent = inputTokens.toLocaleString();
      if (tokensOutEl) tokensOutEl.textContent = outputTokens.toLocaleString();
      costBanner.classList.add('visible');
    }
  }

  function renderHallucinationReport(report: any, deliberationEnabled: boolean) {
    const {
      reportEl: hallucinationReport,
      highEl,
      mediumEl,
      lowEl,
      statusEl,
      detailsSection,
      listEl
    } = getHallucinationDom();
    if (!hallucinationReport) return;

    if (report && deliberationEnabled) {
      hallucinationReport.style.display = 'block';
      if (highEl) {
        highEl.style.display = report.high > 0 ? 'flex' : 'none';
        const count = highEl.querySelector('.count-num');
        if (count) count.textContent = report.high;
      }
      if (mediumEl) {
        mediumEl.style.display = report.medium > 0 ? 'flex' : 'none';
        const count = mediumEl.querySelector('.count-num');
        if (count) count.textContent = report.medium;
      }
      if (lowEl) {
        lowEl.style.display = report.low > 0 ? 'flex' : 'none';
        const count = lowEl.querySelector('.count-num');
        if (count) count.textContent = report.low;
      }

      if (statusEl) {
        if (report.high > 0) {
          statusEl.className = 'hallucination-status hallucination-status-danger';
          statusEl.innerHTML = '<span class="status-icon">🔴</span><span class="status-text">' + report.high + ' säkra fel upptäckta</span>';
          hallucinationReport.className = 'hallucination-report has-high';
        } else if (report.medium > 0) {
          statusEl.className = 'hallucination-status hallucination-status-warning';
          statusEl.innerHTML = '<span class="status-icon">🟠</span><span class="status-text">' + report.medium + ' troliga fel upptäckta</span>';
          hallucinationReport.className = 'hallucination-report has-issues';
        } else if (report.low > 0) {
          statusEl.className = 'hallucination-status hallucination-status-warning';
          statusEl.innerHTML = '<span class="status-icon">🟡</span><span class="status-text">' + report.low + ' misstänkta påståenden</span>';
          hallucinationReport.className = 'hallucination-report has-issues';
        } else {
          statusEl.className = 'hallucination-status hallucination-status-good';
          statusEl.innerHTML = '<span class="status-icon">✅</span><span class="status-text">Inga uppenbara fel upptäckta</span>';
          hallucinationReport.className = 'hallucination-report';
        }
      }

      if (detailsSection && listEl) {
        if (report.items && report.items.length > 0) {
          detailsSection.style.display = 'block';
          listEl.innerHTML = report.items.map((item: any) => {
            const confidenceClass = item.confidence;
            const badge = item.confidence === 'high' ? '🔴' : item.confidence === 'medium' ? '🟠' : '🟡';
            return `
              <div class="hallucination-item ${confidenceClass}">
                <div class="hallucination-item-header">
                  <span>${badge}</span>
                  <span style="color: #fff; font-weight: 500;">Flaggad av ${item.flaggedBy}</span>
                </div>
                <div class="hallucination-item-claim">"${item.claim}"</div>
                <div class="hallucination-item-meta">
                  <span>Källa: ${item.source}</span>
                  <span>Anledning: ${item.reason}</span>
                </div>
              </div>
            `;
          }).join('');
        } else {
          detailsSection.style.display = 'none';
        }
      }
    } else {
      hallucinationReport.style.display = 'none';
    }
  }

  return {
    displayResponse,
    renderSynthesis,
    renderCostBanner,
    renderHallucinationReport
  };
}
