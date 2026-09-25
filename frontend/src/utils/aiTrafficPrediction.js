/**
 * aiTrafficPrediction.js
 * 
 * Lightweight trend-based prediction module for Traffic Intelligence.
 * Uses historical time-series data and linear regression combined with
 * incident impact heuristics to predict future traffic severity.
 */

// Simple Linear Regression Model
export class SimpleLinearRegression {
  constructor() {
    this.slope = 0;
    this.intercept = 0;
  }

  train(dataPoints) {
    // dataPoints is array of { x: timeOffset, y: value }
    if (!dataPoints || dataPoints.length < 2) return;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    const n = dataPoints.length;

    dataPoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += (p.x * p.y);
      sumX2 += (p.x * p.x);
    });

    const denominator = (n * sumX2 - sumX * sumX);
    if (denominator === 0) {
      this.slope = 0;
      this.intercept = sumY / n;
    } else {
      this.slope = (n * sumXY - sumX * sumY) / denominator;
      this.intercept = (sumY - this.slope * sumX) / n;
    }
  }

  predict(x) {
    return this.slope * x + this.intercept;
  }
}

/**
 * Predict future traffic state using recent history and active incidents.
 * @param {Array} history Array of recent normalized traffic states
 * @param {Array} incidents Active incidents
 * @param {Number} targetTimeOffsetMinutes Minutes into the future to predict
 */
export function predictFutureTraffic(history, incidents, targetTimeOffsetMinutes = 15) {
  if (!history || history.length === 0) return null;
  
  // 1. Feature Generation
  const latestState = history[history.length - 1];
  const currentCongestion = latestState.congestionScore || 0;
  
  // Create timeseries data for linear regression (x = index representing time, y = congestion)
  // We treat each history entry as a pseudo-time step
  const dataPoints = history.map((h, i) => ({ x: i, y: h.congestionScore }));
  
  // 2. Trend Prediction Model (Linear Regression)
  const lr = new SimpleLinearRegression();
  lr.train(dataPoints);
  
  // Predict base congestion at future index
  // Assuming 1 index step ~ 1 minute for demo purposes
  const futureIndex = (history.length - 1) + targetTimeOffsetMinutes;
  let predictedCongestion = dataPoints.length > 1 ? lr.predict(futureIndex) : currentCongestion;
  
  // 3. Incident Impact Analysis (Non-linear adjustments)
  // A trend line won't capture the sudden cascading effect of a newly placed CRITICAL incident.
  let incidentPenalty = 0;
  if (incidents && incidents.length > 0) {
    incidents.forEach(inc => {
      if (inc.status === 'ACTIVE') {
        if (inc.severity === 'CRITICAL') incidentPenalty += 25;
        else if (inc.severity === 'HIGH') incidentPenalty += 15;
        else if (inc.severity === 'MEDIUM') incidentPenalty += 8;
        else incidentPenalty += 2;
      }
    });
  }

  // Final predicted congestion
  predictedCongestion += incidentPenalty;
  
  // Apply a decay factor if predicted is super high but there are no incidents
  // (Traffic tends to normalize over time without incidents)
  if (incidentPenalty === 0 && predictedCongestion > currentCongestion) {
     predictedCongestion = currentCongestion + ((predictedCongestion - currentCongestion) * 0.5);
  }

  // Clamp between 0 and 100
  predictedCongestion = Math.max(0, Math.min(100, Math.round(predictedCongestion)));
  
  // 4. Predicted Traffic Severity Mapping
  let predictedSeverity = 'NORMAL';
  if (predictedCongestion >= 86) predictedSeverity = 'CRITICAL';
  else if (predictedCongestion >= 56) predictedSeverity = 'HEAVY';
  else if (predictedCongestion >= 26) predictedSeverity = 'MODERATE';
  
  return {
    targetOffset: targetTimeOffsetMinutes,
    predictedCongestion,
    predictedSeverity,
    trendSlope: parseFloat(lr.slope.toFixed(2)),
    confidence: history.length < 3 ? 'LOW' : (history.length > 5 ? 'HIGH' : 'MEDIUM')
  };
}

/**
 * Maintains a sliding window of historical traffic states
 */
export function appendTrafficHistory(history, newState, maxWindow = 10) {
  if (!newState) return history;
  const updated = [...history, newState];
  if (updated.length > maxWindow) {
    return updated.slice(updated.length - maxWindow);
  }
  return updated;
}
