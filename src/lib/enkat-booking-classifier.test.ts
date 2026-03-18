import { describe, expect, it } from 'vitest';
import {
  classifyBookingType,
  formatProviderName,
  getBookingChoiceReason,
  patientFriendlyBookingType
} from './enkat-booking-classifier';

describe('enkat-booking-classifier', () => {
  it('prioritizes remiss before generic nybesok', () => {
    expect(classifyBookingType('1. Remiss nybesök axel')).toBe('nybesok_remiss');
  });

  it('matches AB as a whole word but not inside longer words', () => {
    expect(classifyBookingType('AB kontroll')).toBe('aterbesok');
    expect(classifyBookingType('ABCD-special')).toBe('ovrigt');
  });

  it('classifies phone and ssk visits explicitly', () => {
    expect(classifyBookingType('Telefontid')).toBe('telefon');
    expect(classifyBookingType('SSK återbesök')).toBe('ssk_besok');
    expect(patientFriendlyBookingType('SSK återbesök')).toBe('Sjuksköterskebesök');
  });

  it('creates patient-friendly labels for remiss and postop visits', () => {
    expect(patientFriendlyBookingType('2. remiss kna')).toBe('Nybesök knä');
    expect(patientFriendlyBookingType('AB op hoft')).toBe('Återbesök efter operation höft');
  });

  it('adds Dr prefix only when missing', () => {
    expect(formatProviderName('Lind')).toBe('Dr. Lind');
    expect(formatProviderName('Dr Lind')).toBe('Dr Lind');
  });

  it('explains why a kept booking row was preferred', () => {
    expect(getBookingChoiceReason('nybesok', 'aterbesok')).toContain('nybesok går före aterbesok');
    expect(getBookingChoiceReason('aterbesok', 'aterbesok', '2026-03-16', '2026-03-15')).toContain('2026-03-16');
  });
});
