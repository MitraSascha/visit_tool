/**
 * GLSL Shader für den 3D Visitenkarten-Viewer
 *
 * Die Dicken-Achse des GLB wird zur Laufzeit aus der Bounding-Box bestimmt.
 * faceAxis  = Normale der Vorder-/Rückfläche
 * uAxis/vAxis = die zwei Breit-/Höhen-Achsen für UV-Mapping
 * minPos/maxPos = Bounding-Box für UV-Normalisierung
 */

export const CARD_VERTEX_SHADER = /* glsl */`
  varying vec3 vLocalNormal;
  varying vec3 vLocalPosition;

  void main() {
    vLocalNormal   = normal;
    vLocalPosition = position;
    gl_Position    = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const CARD_FRAGMENT_SHADER = /* glsl */`
  uniform sampler2D frontMap;
  uniform sampler2D backMap;
  uniform bool      hasFront;
  uniform bool      hasBack;
  uniform vec3      edgeColor;

  // Achsen – aus Bounding-Box bestimmt
  uniform vec3 faceAxis;   // Normale der Vorder-/Rückfläche (in Local Space)
  uniform vec3 uAxis;      // Breiten-Achse für UV.x
  uniform vec3 vAxis;      // Höhen-Achse  für UV.y
  uniform vec3 minPos;
  uniform vec3 maxPos;

  varying vec3 vLocalNormal;
  varying vec3 vLocalPosition;

  float normAxis(vec3 pos, vec3 axis, vec3 bMin, vec3 bMax) {
    float val  = dot(pos,  axis);
    float lo   = dot(bMin, axis);
    float hi   = dot(bMax, axis);
    return clamp((val - lo) / (hi - lo), 0.0, 1.0);
  }

  void main() {
    float faceDot = dot(normalize(vLocalNormal), faceAxis);

    if (faceDot > 0.85) {
      // ── VORDERSEITE ──────────────────────────────────────────────
      // U gespiegelt: nach Rotation von faceAxis → +Z läuft uAxis
      // in Bildschirm-Links-Richtung, daher 1-u korrigiert das.
      vec2 uv = vec2(
        1.0 - normAxis(vLocalPosition, uAxis, minPos, maxPos),
        normAxis(vLocalPosition, vAxis, minPos, maxPos)
      );
      gl_FragColor = hasFront
        ? texture2D(frontMap, uv)
        : vec4(0.96, 0.96, 0.94, 1.0);

    } else if (faceDot < -0.85) {
      // ── RÜCKSEITE ─────────────────────────────────────────────────
      // Rückseite geometrisch gedreht → U bereits gespiegelt,
      // kein zusätzlicher Flip nötig.
      vec2 uv = vec2(
        normAxis(vLocalPosition, uAxis, minPos, maxPos),
        normAxis(vLocalPosition, vAxis, minPos, maxPos)
      );
      gl_FragColor = hasBack
        ? texture2D(backMap, uv)
        : vec4(0.93, 0.93, 0.91, 1.0);

    } else {
      // ── KANTEN ───────────────────────────────────────────────────
      gl_FragColor = vec4(edgeColor, 1.0);
    }
  }
`;
