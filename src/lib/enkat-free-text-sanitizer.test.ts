import { describe, expect, it } from 'vitest';
import { maskSensitiveEnkatText } from './enkat-free-text-sanitizer';

describe('maskSensitiveEnkatText', () => {
  it('masks email addresses while preserving surrounding punctuation', () => {
    expect(maskSensitiveEnkatText('Kontakta "anna@example.com" i stället.')).toBe(
      'Kontakta "[e-post borttagen]" i stället.'
    );
  });

  it('masks Swedish phone numbers with common formatting', () => {
    expect(maskSensitiveEnkatText('Ring +46 70 123 45 67 eller 070-123 45 67.')).toBe(
      'Ring [telefon borttagen] eller [telefon borttagen].'
    );
  });

  it('masks valid Swedish personal identity numbers but leaves unrelated numbers intact', () => {
    expect(maskSensitiveEnkatText('Personnummer 19900101-0017, kod 9001010018.')).toBe(
      'Personnummer [personnummer borttaget], kod 9001010018.'
    );
  });

  it('does not misclassify a Swedish mobile number as a personal identity number', () => {
    expect(maskSensitiveEnkatText('Mobil 0701234567.')).toBe('Mobil [telefon borttagen].');
  });
});
