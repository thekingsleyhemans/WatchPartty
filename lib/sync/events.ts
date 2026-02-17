export function shouldCorrectDrift(hostTime: number, localTime: number, threshold = 0.75) {
  return Math.abs(hostTime - localTime) > threshold;
}