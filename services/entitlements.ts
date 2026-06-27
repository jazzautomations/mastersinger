// ──────────────────────────────────────────────────────────────────────────
// MasterSinger — entitlements (paywall logic, single source of truth).
// Free tier = "depth limit, not time limit" (escopo seção 3):
//   - Tuner: unlimited
//   - Academy: 1 free course (warmup) + the rest locked
//   - Practice: 1 free exercise per type + the rest locked
//   - Everything else: locked behind Pro / active trial
// ──────────────────────────────────────────────────────────────────────────

import type { View } from '../types';
import type { PlanId } from '../data/pricing';

export type SubStatus = 'active' | 'trialing' | 'canceled' | 'expired' | 'past_due';

export interface Subscription {
  user_id: string;
  plan: PlanId | 'trial';
  status: SubStatus;
  current_period_end: string | null;   // ISO when paid access expires
  trial_ends_at: string | null;        // ISO when trial expires
  teacher_code: string | null;         // referral code that granted an extended trial
  asaas_payment_id?: string | null;    // last Asaas payment that activated this (server-only)
  asaas_customer_id?: string | null;   // (server-only)
  updated_at: string | null;
}

// ── Free entitlements ──
export const FREE_COURSE_IDS = ['warmup'];
export const FREE_EXERCISE_IDS = ['sc-beg-cmajor', 'ar-beg-cmajor', 'iv-beg-p5', 'ph-beg-a3'];

// Views fully gated behind Pro / active trial. Anything not listed is free
// (possibly with in-component depth limits, e.g. Academy/Practice).
const PRO_VIEWS: View[] = ['studio', 'ear', 'harmony', 'rhythm', 'theory', 'progress'];

export function isProView(view: View): boolean {
  return PRO_VIEWS.includes(view);
}

// Active paid subscription OR active trial (within its window).
export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  const now = Date.now();
  if (sub.status === 'active') {
    if (sub.current_period_end) {
      return new Date(sub.current_period_end).getTime() > now;
    }
    return true; // active with no end (lifetime / future)
  }
  if (sub.status === 'trialing' || sub.plan === 'trial') {
    if (sub.trial_ends_at) {
      return new Date(sub.trial_ends_at).getTime() > now;
    }
  }
  return false;
}

export function isCourseFree(courseId: string): boolean {
  return FREE_COURSE_IDS.includes(courseId);
}

export function isExerciseFree(exerciseId: string): boolean {
  return FREE_EXERCISE_IDS.includes(exerciseId);
}

// Whole-view gate (used by the router before navigating).
export function canAccessView(view: View, sub: Subscription | null): boolean {
  if (!isProView(view)) return true;
  return isSubscriptionActive(sub);
}

// Per-course gate (used inside Academy).
export function canAccessCourse(courseId: string, sub: Subscription | null): boolean {
  if (isSubscriptionActive(sub)) return true;
  return isCourseFree(courseId);
}

// Per-exercise gate (used inside Practice).
export function canAccessExercise(exerciseId: string, sub: Subscription | null): boolean {
  if (isSubscriptionActive(sub)) return true;
  return isExerciseFree(exerciseId);
}

// Human-readable status for the UI.
export function entitlementLabel(sub: Subscription | null): string {
  if (!sub) return 'Free';
  if (sub.status === 'trialing' || sub.plan === 'trial') {
    if (sub.trial_ends_at) {
      const left = new Date(sub.trial_ends_at).getTime() - Date.now();
      const days = Math.max(0, Math.ceil(left / 86400000));
      return `Trial · ${days}d restantes`;
    }
    return 'Trial';
  }
  if (sub.status === 'active') return 'Pro';
  return 'Free';
}
