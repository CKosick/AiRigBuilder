// Monthly sold-price line chart shared by the tracker's history modal and the /gpu/:id pages
import { fillMonthGaps } from '../utils/priceHistory.js';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

/**
 * Draws one point per month; months without recorded sales show as a gap in the line.
 * Returns the Chart instance (caller destroys it) and how many months had no data.
 */
export function drawPriceHistoryChart(canvas, gpu) {
  const { points, missingMonths } = fillMonthGaps(gpu.history);
  const labels = points.map(h => h.date);
  const data = points.map(h => h.price);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${gpu.name} Avg Sold Price`,
        data: data,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2.5,
        pointBackgroundColor: '#10b981',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#121824',
          titleColor: '#f1f5f9',
          bodyColor: '#10b981',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: (context) => ` Average Sold: $${context.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#64748b',
            font: { family: 'JetBrains Mono', size: 10 },
            callback: (val) => `$${val}`
          }
        }
      }
    }
  });

  return { chart, missingMonths };
}
