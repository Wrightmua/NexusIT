/* ============================================================
   MASCOT CHARACTER SVG COMPONENT
   ============================================================ */
export const MascotCharacter = ({ size = 120, style = {}, className = "", eyeOffset = { x: 0, y: 0 }, isShaking = false, isPassword = false }) => {
  const offsetX = Math.max(-12, Math.min(12, eyeOffset.x || 0));
  const offsetY = Math.max(-8, Math.min(10, eyeOffset.y || 0));
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffd23f" />
          <stop offset="100%" stopColor="#f4a900" />
        </linearGradient>
        <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1f6fd6" />
          <stop offset="100%" stopColor="#0e4fa8" />
        </linearGradient>
        <linearGradient id="vestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ff8a1e" />
          <stop offset="100%" stopColor="#f06a00" />
        </linearGradient>
        <linearGradient id="boltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe159" />
          <stop offset="100%" stopColor="#ffb200" />
        </linearGradient>
        <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff9b7a" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ff9b7a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="400" cy="730" rx="200" ry="26" fill="#0e4fa8" opacity="0.12" />

      {/* ===== BODY ===== */}
      {/* Legs */}
      <g>
        <rect x="330" y="600" width="55" height="110" rx="20" fill="#2b3a55" />
        <rect x="415" y="600" width="55" height="110" rx="20" fill="#2b3a55" />
        <ellipse cx="357" cy="712" rx="42" ry="20" fill="#1c2740" />
        <ellipse cx="443" cy="712" rx="42" ry="20" fill="#1c2740" />
      </g>

      {/* Torso / shirt */}
      <path d="M295 435 Q292 340 400 333 Q508 340 505 435 L518 605 Q400 638 282 605 Z" fill="url(#shirtGrad)" />

      {/* Safety vest */}
      <path d="M328 355 Q326 342 348 337 L352 595 Q328 592 314 578 Z" fill="url(#vestGrad)" />
      <path d="M472 355 Q474 342 452 337 L448 595 Q472 592 486 578 Z" fill="url(#vestGrad)" />
      <path d="M348 337 Q400 350 452 337 L452 360 Q400 374 348 360 Z" fill="url(#vestGrad)" />
      {/* reflective stripes */}
      <rect x="330" y="435" width="24" height="13" rx="3" fill="#fff6d8" />
      <rect x="446" y="435" width="24" height="13" rx="3" fill="#fff6d8" />
      <rect x="330" y="495" width="24" height="13" rx="3" fill="#fff6d8" />
      <rect x="446" y="495" width="24" height="13" rx="3" fill="#fff6d8" />

      {/* Chest emblem: bolt design */}
      <circle cx="400" cy="470" r="34" fill="#ffffff" />
      <circle cx="400" cy="470" r="34" fill="none" stroke="#0e4fa8" strokeWidth="5" />
      <path d="M408 442 L382 476 L398 476 L392 500 L420 464 L402 464 Z" fill="url(#boltGrad)" stroke="#f06a00" strokeWidth="2" strokeLinejoin="round" />

      {/* Left arm - relaxed, holding wrench */}
      <path d="M300 380 Q255 400 245 460 Q240 500 265 530" stroke="url(#shirtGrad)" strokeWidth="46" fill="none" strokeLinecap="round" />
      <g transform="translate(255,535) rotate(-25)">
        <rect x="-10" y="-55" width="20" height="70" rx="7" fill="#8a94a3" />
        <path d="M-22 -58 Q0 -75 22 -58 L16 -40 Q0 -52 -16 -40 Z" fill="#8a94a3" />
        <circle cx="0" cy="20" r="13" fill="#6d7688" />
      </g>
      <circle cx="265" cy="532" r="26" fill="#ffcaa6" />

      {/* Right arm - raised, giving a thumbs up */}
      <path d="M500 380 Q555 370 575 320 Q588 288 578 260" stroke="url(#shirtGrad)" strokeWidth="46" fill="none" strokeLinecap="round" />
      <g transform="translate(578,250)">
        <circle cx="0" cy="14" r="24" fill="#ffcaa6" />
        <path d="M-9 2 Q-9 -24 4 -26 Q16 -27 16 -12 L16 4 Q10 0 2 2 Z" fill="#ffcaa6" stroke="#e8a97e" strokeWidth="2" strokeLinejoin="round" />
        <path d="M-14 14 Q0 22 16 14" stroke="#e8a97e" strokeWidth="2" fill="none" opacity="0.6" />
      </g>

      {/* ===== HEAD (Shakes on login error) ===== */}
      <g style={{
        transformOrigin: "400px 245px",
        animation: isShaking ? "mascotHeadShake 0.65s ease-in-out" : "none",
        transition: "transform .15s ease-out"
      }}>
        <circle cx="335" cy="255" r="17" fill="#ffcaa6" />
        <circle cx="465" cy="255" r="17" fill="#ffcaa6" />
        <circle cx="400" cy="245" r="95" fill="#ffcaa6" />
        <circle cx="345" cy="275" r="26" fill="url(#cheek)" />
        <circle cx="455" cy="275" r="26" fill="url(#cheek)" />
        <path d={`M352 ${210 + (isPassword ? 5 : 0)} Q372 ${196 + (isPassword ? 8 : 0)} 394 ${206 + (isPassword ? 5 : 0)}`} stroke="#5a3b25" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d={`M406 ${206 + (isPassword ? 5 : 0)} Q428 ${196 + (isPassword ? 8 : 0)} 448 ${210 + (isPassword ? 5 : 0)}`} stroke="#5a3b25" strokeWidth="8" fill="none" strokeLinecap="round" />

        {/* Sockets */}
        <circle cx="372" cy="235" r="17" fill="#ffffff" stroke="#e0c0a8" strokeWidth="2" />
        <circle cx="428" cy="235" r="17" fill="#ffffff" stroke="#e0c0a8" strokeWidth="2" />

        {/* Dynamic Pupils following input cursor */}
        <circle cx={372 + offsetX} cy={235 + offsetY} r={isPassword ? 9 : 11} fill="#2b3a55" style={{ transition: "cx .12s ease-out, cy .12s ease-out" }} />
        <circle cx={428 + offsetX} cy={235 + offsetY} r={isPassword ? 9 : 11} fill="#2b3a55" style={{ transition: "cx .12s ease-out, cy .12s ease-out" }} />
        <circle cx={375 + offsetX} cy={231 + offsetY} r={3.5} fill="#ffffff" style={{ transition: "cx .12s ease-out, cy .12s ease-out" }} />
        <circle cx={431 + offsetX} cy={231 + offsetY} r={3.5} fill="#ffffff" style={{ transition: "cx .12s ease-out, cy .12s ease-out" }} />

        <path d="M398 245 Q392 262 400 268 Q408 265 404 255" fill="#f5b892" />
        <path d={isShaking ? "M360 290 Q400 270 440 290" : "M355 278 Q400 320 445 278 Q400 305 355 278 Z"} fill={isShaking ? "none" : "#7a3428"} stroke={isShaking ? "#7a3428" : "none"} strokeWidth={isShaking ? 6 : 0} strokeLinecap="round" />
        {!isShaking && <path d="M362 280 Q400 308 438 280 Q400 292 362 280 Z" fill="#ffffff" />}
        <path d="M330 270 Q340 305 380 320" stroke="#e8a97e" strokeWidth="4" fill="none" opacity="0.5" strokeLinecap="round" />
        <path d="M300 195 Q305 120 400 112 Q495 120 500 195 Q500 205 490 205 L310 205 Q300 205 300 195 Z" fill="url(#hatGrad)" stroke="#d99400" strokeWidth="3" />
        <rect x="292" y="198" width="216" height="22" rx="11" fill="#f4a900" stroke="#d99400" strokeWidth="2" />
        <path d="M400 112 Q400 150 400 198" stroke="#d99400" strokeWidth="4" />
        <path d="M410 130 L396 158 L406 158 L392 182 L412 152 L402 152 Z" fill="#ffffff" opacity="0.85" />
      </g>

      {/* Sparkle accents */}
      <g fill="#ffd23f">
        <path d="M645 250 L651 268 L669 274 L651 280 L645 298 L639 280 L621 274 L639 268 Z" />
        <path d="M120 340 L124 352 L136 356 L124 360 L120 372 L116 360 L104 356 L116 352 Z" />
      </g>
    </svg>
  );
};
