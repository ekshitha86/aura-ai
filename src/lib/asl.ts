import type { Landmark } from "./hand-detector";
import { fingersUp } from "./hand-detector";

function dist(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Heuristic ASL alphabet classifier from MediaPipe 21-point landmarks.
 * Pragmatic — recognises clearly-formed static letters. J & Z require motion
 * and are approximated from their static start pose.
 */
export function classifyASL(lm: Landmark[]): { letter: string; conf: number } | null {
  if (!lm || lm.length < 21) return null;
  const f = fingersUp(lm);
  const handSize = dist(lm[0], lm[9]) || 0.0001;

  const thumbIndexTip = dist(lm[4], lm[8]) / handSize;
  const thumbMiddleTip = dist(lm[4], lm[12]) / handSize;
  const indexMiddleTip = dist(lm[8], lm[12]) / handSize;

  const noneUp = !f.index && !f.middle && !f.ring && !f.pinky;
  const allUp = f.index && f.middle && f.ring && f.pinky;

  // A: fist, thumb on side
  if (noneUp && !f.thumb) return { letter: "A", conf: 0.85 };
  // B: all four fingers up, thumb tucked across palm
  if (allUp && !f.thumb) return { letter: "B", conf: 0.85 };
  // C: curved hand — thumb and index form a C shape
  if (!f.index && !f.middle && !f.ring && !f.pinky && thumbIndexTip > 0.4 && thumbIndexTip < 0.9) {
    return { letter: "C", conf: 0.7 };
  }
  // D: index up, others folded, thumb touches middle finger
  if (f.index && !f.middle && !f.ring && !f.pinky && thumbMiddleTip < 0.35) {
    return { letter: "D", conf: 0.8 };
  }
  // E: all curled, thumb across
  if (noneUp && f.thumb === false && dist(lm[4], lm[8]) / handSize < 0.4) {
    return { letter: "E", conf: 0.6 };
  }
  // F: thumb+index pinch (OK-like), other three up
  if (thumbIndexTip < 0.3 && f.middle && f.ring && f.pinky) {
    return { letter: "F", conf: 0.85 };
  }
  // I: pinky up only
  if (!f.index && !f.middle && !f.ring && f.pinky) return { letter: "I", conf: 0.85 };
  // L: index up + thumb out (90deg)
  if (f.index && !f.middle && !f.ring && !f.pinky && f.thumb && thumbIndexTip > 0.55) {
    return { letter: "L", conf: 0.85 };
  }
  // V: index + middle up, apart
  if (f.index && f.middle && !f.ring && !f.pinky && indexMiddleTip > 0.25) {
    return { letter: "V", conf: 0.8 };
  }
  // U: index + middle up, together
  if (f.index && f.middle && !f.ring && !f.pinky && indexMiddleTip < 0.18) {
    return { letter: "U", conf: 0.75 };
  }
  // W: index + middle + ring up
  if (f.index && f.middle && f.ring && !f.pinky) return { letter: "W", conf: 0.85 };
  // Y: thumb + pinky out, others folded
  if (!f.index && !f.middle && !f.ring && f.pinky && f.thumb) {
    return { letter: "Y", conf: 0.9 };
  }
  // R: index + middle up & crossed (tips close)
  if (f.index && f.middle && !f.ring && !f.pinky && indexMiddleTip < 0.12) {
    return { letter: "R", conf: 0.7 };
  }
  // K: index + middle up, thumb between them
  if (f.index && f.middle && !f.ring && !f.pinky && thumbMiddleTip < 0.3 && indexMiddleTip > 0.2) {
    return { letter: "K", conf: 0.65 };
  }
  // O: all fingers curved meeting thumb
  const avgTipToThumb =
    (dist(lm[8], lm[4]) + dist(lm[12], lm[4]) + dist(lm[16], lm[4]) + dist(lm[20], lm[4])) /
    4 /
    handSize;
  if (!allUp && avgTipToThumb < 0.4) return { letter: "O", conf: 0.7 };
  // S: fist, thumb across front
  if (noneUp && dist(lm[4], lm[10]) / handSize < 0.4) return { letter: "S", conf: 0.6 };
  // M: three fingers over thumb (index, middle, ring folded over thumb)
  if (noneUp && dist(lm[4], lm[16]) / handSize < 0.35) return { letter: "M", conf: 0.55 };
  // N: two fingers over thumb
  if (noneUp && dist(lm[4], lm[12]) / handSize < 0.35) return { letter: "N", conf: 0.55 };
  // T: thumb between index & middle
  if (noneUp && dist(lm[4], lm[6]) / handSize < 0.3) return { letter: "T", conf: 0.55 };
  // G: index pointing sideways
  if (f.index && !f.middle && !f.ring && !f.pinky && f.thumb && thumbIndexTip > 0.4) {
    return { letter: "G", conf: 0.6 };
  }
  // H: index + middle pointing sideways together
  if (f.index && f.middle && !f.ring && !f.pinky && indexMiddleTip < 0.2) {
    return { letter: "H", conf: 0.6 };
  }
  // P: like K rotated down
  if (f.index && f.middle && !f.ring && !f.pinky && lm[8].y > lm[5].y) {
    return { letter: "P", conf: 0.55 };
  }
  // Q: like G rotated down
  if (f.index && !f.middle && !f.ring && !f.pinky && lm[8].y > lm[5].y) {
    return { letter: "Q", conf: 0.55 };
  }
  // X: index bent (hook)
  if (!f.index && !f.middle && !f.ring && !f.pinky && dist(lm[8], lm[5]) / handSize > 0.4) {
    return { letter: "X", conf: 0.55 };
  }
  // J: like I but moving (approximated as I)
  // Z: like D but moving (approximated as D)

  return null;
}