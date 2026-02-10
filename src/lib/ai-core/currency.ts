type CostFormatResult = {
  primary: string;
  secondary?: string;
};

export function isSwedishLanguage(lang?: string) {
  return (lang || '').toLowerCase().startsWith('sv');
}

export function formatCostForLocale(totalCostUsd: number, lang?: string): CostFormatResult {
  const sekRate = 10.5;
  const sekCost = totalCostUsd * sekRate;

  if (isSwedishLanguage(lang)) {
    return {
      primary: `${sekCost.toFixed(2)} kr`,
      secondary: `$${totalCostUsd.toFixed(4)}`
    };
  }

  return {
    primary: `$${totalCostUsd.toFixed(4)}`,
    secondary: `(~${sekCost.toFixed(2)} kr)`
  };
}
