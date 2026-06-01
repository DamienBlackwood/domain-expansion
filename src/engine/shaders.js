export const vertexShader = `
    attribute vec3 color;
    attribute float size;
    varying vec3 vColor;
    varying float vScreenY;
    void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(size * (320.0 / -mv.z), 1.0, 96.0);
        gl_Position  = projectionMatrix * mv;
        vScreenY = gl_Position.y / gl_Position.w;
    }
`;

export const fragmentShader = `
    uniform float uTime;
    varying vec3 vColor;
    varying float vScreenY;
    void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p) * 2.0;

        float core = exp(-d * d * 12.0);
        float glow = exp(-d * d * 2.5);
        float aura = exp(-d * d * 0.6);

        float shimmer = 1.0 + sin(vScreenY * 3.7 + uTime * 2.4) * 0.035;

        float alpha = (core * 0.9 + glow * 0.4 + aura * 0.12) * shimmer;
        alpha *= (1.0 - d * d * 0.6);
        if (alpha < 0.003) discard;

        float luminance = core * 1.1 + glow * 0.45 + aura * 0.15;
        vec3 col = vColor * (0.35 + luminance) * shimmer;
        col += vColor * (core * 0.06);

        gl_FragColor = vec4(col, alpha);
    }
`;
