// Adapter against the hash-pinned published worker's local identifiers:
// bt: tracked body IDs; Y: MuJoCo data; In: force pulse; jo/Dn: run/epoch.
// The original rollout path still calls Dl(direction) and retains 50 N behavior.
function Dl(direction, force = 50) {
  const bodyId = bt[0];
  const pulse = createPulse(direction, force, Y.xquat.slice(bodyId * 4, bodyId * 4 + 4), Y.time);
  if (!pulse) return null;
  In = pulse;
  return {type:'push-applied', direction, forceN:force, vector:pulse.force,
    bodyId, startTime:Y.time, endTime:pulse.until, runId:jo, epoch:Dn};
}
