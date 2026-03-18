const PERSONAL_IDENTITY_NUMBER_PATTERN = /\b(?:\d{6}[-+ ]?\d{4}|\d{8}[-+ ]?\d{4})\b/g;

function isDigit(value: string | undefined): boolean {
  return value !== undefined && value >= '0' && value <= '9';
}

function containsOnlyDigits(value: string): boolean {
  for (const character of value) {
    if (!isDigit(character)) {
      return false;
    }
  }

  return value.length > 0;
}

function isPhoneCandidateCharacter(value: string | undefined): boolean {
  return isDigit(value) || value === '+' || value === ' ' || value === '-' || value === '(' || value === ')';
}

function normalizePhoneCandidate(value: string): string {
  let normalized = '';

  for (const character of value) {
    if (isDigit(character)) {
      normalized += character;
      continue;
    }

    if (character === '+' && normalized.length === 0) {
      normalized += character;
    }
  }

  return normalized;
}

function isLikelySwedishPhoneNumber(value: string): boolean {
  const normalized = normalizePhoneCandidate(value);
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;

  if (!containsOnlyDigits(digits)) {
    return false;
  }

  if (normalized.startsWith('+')) {
    return digits.startsWith('46') && digits.length >= 9 && digits.length <= 14;
  }

  if (digits.startsWith('0')) {
    return digits.length >= 9 && digits.length <= 12;
  }

  if (digits.startsWith('46')) {
    return digits.length >= 9 && digits.length <= 14;
  }

  return false;
}

function maskPhoneNumbers(value: string): string {
  let masked = '';
  let index = 0;

  while (index < value.length) {
    const character = value[index];
    if (character !== '+' && !isDigit(character)) {
      masked += character;
      index += 1;
      continue;
    }

    if (character !== '+' && index > 0 && isDigit(value[index - 1])) {
      masked += character;
      index += 1;
      continue;
    }

    let candidateEnd = index;
    while (candidateEnd < value.length && isPhoneCandidateCharacter(value[candidateEnd])) {
      candidateEnd += 1;
    }

    let candidateCoreEnd = candidateEnd;
    while (
      candidateCoreEnd > index
      && [' ', '-', '(', ')'].includes(value[candidateCoreEnd - 1] ?? '')
    ) {
      candidateCoreEnd -= 1;
    }

    const candidate = value.slice(index, candidateCoreEnd);
    const trailingCharacters = value.slice(candidateCoreEnd, candidateEnd);
    if (isLikelySwedishPhoneNumber(candidate)) {
      masked += `[telefon borttagen]${trailingCharacters}`;
      index = candidateEnd;
      continue;
    }

    masked += character;
    index += 1;
  }

  return masked;
}

function passesLuhn(value: string): boolean {
  let sum = 0;

  for (let index = 0; index < value.length; index += 1) {
    let digit = Number(value[index]);
    if (Number.isNaN(digit)) {
      return false;
    }

    if (index % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
  }

  return sum % 10 === 0;
}

function inferFullYearFromShortYear(twoDigitYear: number, separator: '+' | '-' | null): number {
  const currentTwoDigitYear = new Date().getFullYear() % 100;
  let fullYear = (twoDigitYear > currentTwoDigitYear ? 1900 : 2000) + twoDigitYear;

  if (separator === '+') {
    fullYear -= 100;
  }

  return fullYear;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const maxDay = new Date(year, month, 0).getDate();
  return day <= maxDay;
}

function isLikelySwedishPersonalIdentityNumber(value: string): boolean {
  const compact = value.replace(/[^\d]/g, '');
  if (compact.length !== 10 && compact.length !== 12) {
    return false;
  }

  const tenDigits = compact.length === 12 ? compact.slice(2) : compact;
  const separator = value.includes('+') ? '+' : value.includes('-') ? '-' : null;
  const year = compact.length === 12
    ? Number(compact.slice(0, 4))
    : inferFullYearFromShortYear(Number(compact.slice(0, 2)), separator);
  const month = Number(tenDigits.slice(2, 4));
  const rawDay = Number(tenDigits.slice(4, 6));
  const day = rawDay > 60 ? rawDay - 60 : rawDay;

  return isValidCalendarDate(year, month, day) && passesLuhn(tenDigits);
}

function maskPersonalIdentityNumbers(value: string): string {
  return value.replace(PERSONAL_IDENTITY_NUMBER_PATTERN, (candidate) => {
    if (!isLikelySwedishPersonalIdentityNumber(candidate)) {
      return candidate;
    }

    return '[personnummer borttaget]';
  });
}

function isLikelyEmail(value: string): boolean {
  const atIndex = value.indexOf('@');
  if (atIndex <= 0 || atIndex >= value.length - 3) {
    return false;
  }

  const domain = value.slice(atIndex + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

function splitEdgePunctuation(value: string): {
  leading: string;
  core: string;
  trailing: string;
} {
  const leadingChars = '\'"([{<';
  const trailingChars = '\'",.;:!?)]}>';
  let start = 0;
  let end = value.length;

  while (start < end && leadingChars.includes(value[start] ?? '')) {
    start += 1;
  }

  while (end > start && trailingChars.includes(value[end - 1] ?? '')) {
    end -= 1;
  }

  return {
    leading: value.slice(0, start),
    core: value.slice(start, end),
    trailing: value.slice(end)
  };
}

function maskEmailLikeTokens(value: string): string {
  return value
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) {
        return part;
      }

      const { leading, core, trailing } = splitEdgePunctuation(part);
      if (!isLikelyEmail(core)) {
        return part;
      }

      return `${leading}[e-post borttagen]${trailing}`;
    })
    .join('');
}

export function maskSensitiveEnkatText(value: string): string {
  return maskEmailLikeTokens(maskPhoneNumbers(maskPersonalIdentityNumbers(value)));
}
