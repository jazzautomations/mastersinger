const FREE_COURSE_IDS = ['warmup'];
const FREE_EXERCISE_IDS = ['sc-beg-cmajor', 'ar-beg-cmajor', 'iv-beg-p5', 'ph-beg-a3'];

const PRO_VIEWS = ['studio', 'ear', 'harmony', 'theory', 'progress'];

function isProView(view) {
  return PRO_VIEWS.includes(view);
}

function isSubscriptionActive(sub) {
  if (!sub) return false;
  var now = Date.now();
  if (sub.status === 'active') {
    if (sub.current_period_end) {
      return new Date(sub.current_period_end).getTime() > now;
    }
    return true;
  }
  if (sub.status === 'trialing' || sub.plan === 'trial') {
    if (sub.trial_ends_at) {
      return new Date(sub.trial_ends_at).getTime() > now;
    }
  }
  return false;
}

function isCourseFree(courseId) {
  return FREE_COURSE_IDS.includes(courseId);
}

function isExerciseFree(exerciseId) {
  return FREE_EXERCISE_IDS.includes(exerciseId);
}

function canAccessView(view, sub) {
  if (!isProView(view)) return true;
  return isSubscriptionActive(sub);
}

function canAccessCourse(courseId, sub) {
  if (isSubscriptionActive(sub)) return true;
  return isCourseFree(courseId);
}

function canAccessExercise(exerciseId, sub) {
  if (isSubscriptionActive(sub)) return true;
  return isExerciseFree(exerciseId);
}

function entitlementLabel(sub) {
  if (!sub) return 'Free';
  if (sub.status === 'trialing' || sub.plan === 'trial') {
    if (sub.trial_ends_at) {
      var left = new Date(sub.trial_ends_at).getTime() - Date.now();
      var days = Math.max(0, Math.ceil(left / 86400000));
      return 'Trial · ' + days + 'd restantes';
    }
    return 'Trial';
  }
  if (sub.status === 'active') return 'Pro';
  return 'Free';
}

module.exports = {
  FREE_COURSE_IDS, FREE_EXERCISE_IDS, PRO_VIEWS,
  isProView, isSubscriptionActive, isCourseFree, isExerciseFree,
  canAccessView, canAccessCourse, canAccessExercise, entitlementLabel,
};
