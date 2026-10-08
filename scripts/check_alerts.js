// scripts/check_alerts.js
// Standalone script to evaluate active price-drop alert subscriptions against current GPUS_DATA
import { GPUS_DATA } from '../src/data/gpus.js';
import { evaluateAndTriggerAlerts } from '../src/services/alertService.js';

async function main() {
  console.log('====================================================');
  console.log('🔔 AI RIG BUILDER — EVALUATING PRICE-DROP ALERTS');
  console.log('====================================================');

  const result = await evaluateAndTriggerAlerts(GPUS_DATA);

  console.log(`Alert store: ${result.store}`);
  console.log(`Total alerts in database: ${result.totalAlerts}`);
  console.log(`Active pending-drop alerts: ${result.activeAlerts}`);
  console.log(`Alerts fired in this run: ${result.firedCount}`);

  if (result.firedAlerts.length > 0) {
    console.log('\nFired Notifications:');
    console.table(result.firedAlerts.map(a => ({
      Subscriber: a.email,
      GPU: a.gpuName,
      'Target Price': `$${a.targetPrice}`,
      'Trigger Price': `$${a.droppedPrice}`
    })));
  } else {
    console.log('\n✓ No new price drops triggered alerts.');
  }
}

main().catch(err => {
  console.error('Fatal error checking alerts:', err);
  process.exit(1);
});
