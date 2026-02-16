# Domain Expansion

Real-time JJK cursed technique visualizer

Inspired by [SAT0RU](https://github.com/reinesana/SAT0RU) by reinesana.

---

## Gestures

Current mapping in code (not ideal, but accurate to the current implementation):

| Gesture | Technique |
|---|---|
| Pinch (thumb + index) | Secret Technique: Hollow Purple |
| Closed fist | Cursed Technique: Blue |
| Thumb + index + middle up, ring + pinky down, index/middle close together (Finger Gun) | Reverse Cursed Technique: Red |
| Index up + middle curled over index, ring + pinky down (Gojo's Hand Sign) | Domain Expansion: Infinite Void |
| Two hands: Sukuna mudra (strict) | Domain Expansion: Malevolent Shrine |
| Two hands in frame (not mudra) | No cast (reserved for mudra detection only) |
| Open hand + quick flick (after charging red/blue/purple) | Release Cast |

## Known Issues

- Gesture detection is still unstable and sensitive to camera angle/distance.
- Red and Infinite Void can still conflict in edge cases because both rely on index/middle geometry.
- Shrine is mudra-only in two-hand mode; prayer and two-hand technique combos are intentionally disabled.
- This README reflects the current behavior in `index.html`, even where behavior is broken. (Things will improve!)

## Run

Install the **Live Server** extension in VS Code, right-click `index.html`, and select **Open with Live Server**.

Requires a webcam and a modern browser (Chrome recommended).

## Stack

Three.js · MediaPipe Hands · WebGL GLSL shaders · UnrealBloom post-processing
