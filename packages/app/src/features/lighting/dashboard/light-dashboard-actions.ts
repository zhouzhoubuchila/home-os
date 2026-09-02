import { dispatchEntityCommand } from '@navet/app/commands';
import type { LightDashboardItem } from './light-dashboard-model';

export interface LightBatchActionResult {
  succeeded: number;
  failed: number;
  skippedUnavailable: number;
}

export async function setLightsPower(
  lights: LightDashboardItem[],
  state: 'on' | 'off'
): Promise<LightBatchActionResult> {
  const targets = lights.filter((light) => light.available && light.supportsToggle);
  const results = await Promise.allSettled(
    targets.flatMap((light) => {
      const commandTargets =
        light.commandTargets[state] ??
        (light.primaryCommandTarget ? [light.primaryCommandTarget] : []);
      return commandTargets.map(async (entityId) => {
        const result = await dispatchEntityCommand(
          { type: state === 'on' ? 'turn_on' : 'turn_off', entityId },
          light.providerId
        );
        if (!result.accepted) throw new Error(result.error ?? 'Command was rejected');
      });
    })
  );

  return {
    succeeded: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
    skippedUnavailable: lights.filter((light) => !light.available).length,
  };
}

export async function setLightsBrightness(
  lights: LightDashboardItem[],
  brightness: number
): Promise<LightBatchActionResult> {
  const targets = lights.filter((light) => light.available && light.supportsBrightness);
  const normalizedBrightness = Math.min(100, Math.max(1, Math.round(brightness)));
  const results = await Promise.allSettled(
    targets.flatMap((light) =>
      (light.commandTargets.brightness ?? []).map(async (entityId) => {
        const result = await dispatchEntityCommand(
          { type: 'set_brightness', entityId, brightness: normalizedBrightness },
          light.providerId
        );
        if (!result.accepted) throw new Error(result.error ?? 'Command was rejected');
      })
    )
  );

  return {
    succeeded: results.filter((result) => result.status === 'fulfilled').length,
    failed: results.filter((result) => result.status === 'rejected').length,
    skippedUnavailable: lights.filter((light) => !light.available).length,
  };
}
