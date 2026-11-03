// Shared lazy loader for Chart.js
// Dynamically imports Chart.js on first call and registers the union of components
// needed across all chart consumers (priceHistoryChart and breakEvenCalc).

let chartPromise = null;
let loadedChart = null;

/**
 * Dynamically loads Chart.js and registers required components.
 * Caches the load promise in module scope so subsequent calls share it.
 *
 * @returns {Promise<typeof import('chart.js').Chart | null>}
 */
export function loadChartJs() {
  if (loadedChart) return Promise.resolve(loadedChart);
  if (!chartPromise) {
    chartPromise = import('chart.js')
      .then(({ Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend }) => {
        Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler, Legend);
        loadedChart = Chart;
        return Chart;
      })
      .catch((err) => {
        chartPromise = null;
        console.error('Failed to load Chart.js:', err);
        return null;
      });
  }
  return chartPromise;
}
