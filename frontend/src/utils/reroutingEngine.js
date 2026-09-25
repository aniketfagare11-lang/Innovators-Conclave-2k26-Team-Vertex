/**
 * reroutingEngine.js
 * 
 * Orchestrates dynamic rerouting decisions based on multiple factors:
 * Traffic changes, incidents, predictions, and score thresholds.
 */

// Configurable thresholds to prevent route oscillation
export const REROUTE_CONFIG = {
  MIN_SCORE_IMPROVEMENT: 10,     // Only reroute if the new route is X points better
  COOLDOWN_MS: 15000,            // Prevent rerouting multiple times in a short window
};

/**
 * Compares the current route score with alternative route scores to determine 
 * if a reroute is justified.
 * 
 * @param {Array} scoredRoutes - output of rankRoutes()
 * @param {String} currentRouteId - id of the active route ('optimal', 'normal', 'alternative')
 * @returns {Object} { shouldReroute, reason, improvement, newRecommendedId }
 */
export function evaluateReroute(scoredRoutes, currentRouteId) {
  if (!scoredRoutes || scoredRoutes.length < 2) {
    return { shouldReroute: false, reason: 'Not enough routes to compare' };
  }

  const currentScored = scoredRoutes.find(r => r.id === currentRouteId);
  const recommendedScored = scoredRoutes[0]; // Always sorted highest to lowest

  if (!currentScored) {
    return { 
      shouldReroute: true, 
      reason: 'Current route no longer viable', 
      newRecommendedId: recommendedScored.id,
      improvement: 0 
    };
  }

  if (currentScored.id === recommendedScored.id) {
    return { 
      shouldReroute: false, 
      reason: 'Current route is already the recommended route', 
      status: 'STABLE ✓'
    };
  }

  const improvement = recommendedScored.score - currentScored.score;

  if (improvement >= REROUTE_CONFIG.MIN_SCORE_IMPROVEMENT) {
    return {
      shouldReroute: true,
      reason: `Alternative route score improved by ${Math.round(improvement)} points`,
      improvement,
      newRecommendedId: recommendedScored.id,
      currentScore: Math.round(currentScored.score),
      recommendedScore: Math.round(recommendedScored.score)
    };
  }

  return {
    shouldReroute: false,
    reason: `Improvement (+${Math.round(improvement)}) below threshold (${REROUTE_CONFIG.MIN_SCORE_IMPROVEMENT})`,
    improvement,
    status: 'ROUTE AT RISK ↓'
  };
}

/**
 * Formats a timeline event for rerouting.
 */
export function formatRerouteTimelineEvent(oldId, newId, improvement) {
  return {
    key: `reroute_${Date.now()}`,
    icon: '🔄',
    label: `Rerouted ${oldId.toUpperCase()} → ${newId.toUpperCase()} (+${Math.round(improvement)})`,
    time: new Date().toLocaleTimeString('en-IN'),
    done: true,
    active: false
  };
}
