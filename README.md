# domain expansion

real-time jjk cursed technique visualizer

idea inspired by [SAT0RU](https://github.com/reinesana/SAT0RU) by reinesana.

---

## gestures

current mapping in code (not ideal, its just how it works right now):

| gesture | technique |
|---|---|
| pinch (thumb + index) | secret technique: hollow purple |
| closed fist | cursed technique: blue |
| thumb + index + middle up, ring + pinky down, index/middle close together (finger gun) | reverse cursed technique: red |
| index up + middle curled over index, ring + pinky down (gojo's hand sign) | domain expansion: infinite void |
| two hands: sukuna mudra (strict) | domain expansion: malevolent shrine |
| two hands in frame (not mudra) | no cast (reserved for mudra detection only) |
| open hand + quick flick (after charging red/blue/purple) | release cast |

## known issues

- gesture detection is still a bit unstable and sensitive to camera angle/distance
- red and infinite void can conflict in edge cases since both depend on index/middle geometry
- shrine is mudra-only in two-hand mode; prayer and two-hand combos are intentionally disabled
- this readme matches the current behavior in `index.html`, even where things are broken (will improve)
- and a lot more... *that I will get to*

## trying it out yourself

there's two ways, you can run a live server inside of VS-CODE, or you can just do:

```bash
python -m http.server 8080 # or any port
```


## requirements

it obviously requires a webcam and a modern browser (chrome recommended)
