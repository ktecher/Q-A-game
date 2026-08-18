import { describe, it, expect } from 'vitest';
import { formatScore, toArabicDigits } from './format';

describe('formatScore', () => {
  it('zero-pads to four digits', () => {
    expect(formatScore(0)).toBe('0000');
    expect(formatScore(800)).toBe('0800');
  });

  it('keeps the sign when the host docks a team below zero', () => {
    expect(formatScore(-200)).toBe('-0200');
  });

  it('does not truncate a score past four digits', () => {
    expect(formatScore(12000)).toBe('12000');
  });
});

describe('toArabicDigits', () => {
  it('maps every Western digit to its Arabic-Indic form', () => {
    expect(toArabicDigits('0123456789')).toBe('٠١٢٣٤٥٦٧٨٩');
  });

  it('leaves non-digits alone', () => {
    expect(toArabicDigits('+400')).toBe('+٤٠٠');
  });
});
