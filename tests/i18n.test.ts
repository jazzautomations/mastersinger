import { describe, it, expect } from 'vitest';
import { t } from '../i18n/strings';

describe('i18n strings', () => {
  it('returns English string for "en"', () => {
    expect(t('en', 'app.name')).toBe('MasterSinger');
    expect(t('en', 'nav.tuner')).toBe('Tuner');
    expect(t('en', 'common.start')).toBe('Start');
  });

  it('returns Portuguese string for "pt-BR"', () => {
    expect(t('pt-BR', 'app.name')).toBe('MasterSinger');
    expect(t('pt-BR', 'nav.tuner')).toBe('Afinador');
    expect(t('pt-BR', 'common.start')).toBe('Começar');
  });

  it('returns key for unknown keys', () => {
    expect(t('en', 'nonexistent.key')).toBe('nonexistent.key');
    expect(t('pt-BR', 'nonexistent.key')).toBe('nonexistent.key');
  });

  it('PT and EN have same keys', () => {
    // We test that all keys we care about resolve in both langs
    const testKeys = [
      'app.name', 'app.tagline',
      'common.start', 'common.stop', 'common.record', 'common.play', 'common.export',
      'nav.home', 'nav.tuner', 'nav.practice', 'nav.studio', 'nav.ear',
      'nav.theory', 'nav.harmony', 'nav.academy', 'nav.progress', 'nav.settings',
      'home.welcome', 'home.dailyChallenge', 'home.continueLearning', 'home.quickTuner',
      'tuner.title', 'tuner.subtitle', 'tuner.start', 'tuner.stop',
      'practice.title', 'practice.subtitle',
      'studio.title', 'studio.subtitle',
      'ear.title', 'ear.subtitle',
      'theory.title', 'theory.subtitle',
      'harmony.title', 'harmony.subtitle',
      'academy.title', 'academy.subtitle',
      'progress.title', 'settings.title',
    ];
    testKeys.forEach(k => {
      // Both should return non-key (i.e. real translation)
      expect(t('en', k)).not.toBe(k);
      expect(t('pt-BR', k)).not.toBe(k);
    });
  });
});
