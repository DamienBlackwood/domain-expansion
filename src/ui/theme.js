import { COUNT } from '../utils.js';
import { initPhases, snapToTarget } from '../engine/particles.js';
import { setBackground } from '../engine/scene.js';
import { releaseFx } from '../techniques/release.js';
import { animateNeutral } from '../techniques/neutral.js';
import { animateRed } from '../techniques/red.js';
import { animateBlue } from '../techniques/blue.js';
import { animatePurple } from '../techniques/purple.js';
import { animateVoid } from '../techniques/void.js';
import { animateShrine } from '../techniques/shrine.js';
import { animateChimera } from '../techniques/chimera.js';
import { state } from '../state.js';

export const techTheme = {
    neutral: { color: 'rgba(120, 200, 180, 1)', shadow: 'rgba(120, 200, 180, 0.4)' },
    purple:  { color: '#cc00ff', shadow: 'rgba(180,0,255,0.7)' },
    blue:    { color: '#2080ff', shadow: 'rgba(20,100,255,0.8)' },
    red:     { color: '#ff0a00', shadow: 'rgba(200,0,0,0.85)' },
    void:    { color: '#ffffff', shadow: 'rgba(255,255,255,0.6)' },
    shrine:  { color: '#ff3d1f', shadow: 'rgba(255,60,20,0.8)' },
    chimera: { color: '#00e5cc', shadow: 'rgba(0,200,180,0.8)' },
};

export const techNames = {
    neutral: 'CURSED ENERGY',
    purple: 'SECRET TECHNIQUE: HOLLOW PURPLE',
    blue: 'CURSED TECHNIQUE: BLUE',
    red: 'REVERSE CURSED TECHNIQUE: RED',
    void: 'DOMAIN EXPANSION: INFINITE VOID',
    shrine:  'DOMAIN EXPANSION: MALEVOLENT SHRINE',
    chimera: 'DOMAIN EXPANSION: CHIMERA SHADOW GARDEN',
};

const shrineOverlay  = document.getElementById('shrine-overlay');
const chimeraOverlay = document.getElementById('chimera-overlay');

export function updateState(tech) {
    if (state.currentTech === tech) return;
    state.currentTech = tech;
    state.techTime = 0;
    initPhases();
    releaseFx.active = false;
    releaseFx.burst = 0;

    const theme = techTheme[tech] || techTheme.neutral;
    const nameEl = document.getElementById('technique-name');
    nameEl.innerText = techNames[tech] || '';
    nameEl.style.color = theme.color;
    nameEl.style.textShadow = `0 0 12px ${theme.shadow}`;
    state.glowColor = theme.color;
    const lerpRates = { neutral: 0.07, blue: 0.11, red: 0.14, purple: 0.13, void: 0.18, shrine: 0.06, chimera: 0.06 };
    state.lerpRate = lerpRates[tech] || 0.1;

    const shakeAmounts = { neutral: 0, blue: 0.7, red: 1.2, purple: 1.4, void: 0.5, shrine: 0.8, chimera: 0.7 };
    state.shakeDecay = shakeAmounts[tech] || 0;
    state.shakeTime = 0;

    const clearColors = {
        neutral: 0x0f0f0f,
        red:     0x0a0000,
        blue:    0x000814,
        purple:  0x07000f,
        void:    0x00020a,
        shrine:  0x080000,
        chimera: 0x00080a,
    };
    setBackground(clearColors[tech] || 0x0f0f0f);

    const bodyColors = { red: '#0a0000', blue: '#000814', purple: '#07000f', void: '#00020a', shrine: '#080000', chimera: '#00080a' };
    document.body.style.background = bodyColors[tech] || '#0f0f0f';

    shrineOverlay.classList.toggle('active', tech === 'shrine');
    chimeraOverlay.classList.toggle('active', tech === 'chimera');

    if (tech === 'void') animateVoid(0);
    else if (tech === 'red') animateRed(0);
    else if (tech === 'blue') animateBlue(0);
    else if (tech === 'purple') animatePurple(0);
    else if (tech === 'shrine')  animateShrine(0);
    else if (tech === 'chimera') animateChimera(0);
    else animateNeutral(0);

    if (tech === 'red' || tech === 'blue') {
        snapToTarget();
    }
}
