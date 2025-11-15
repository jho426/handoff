let lastColor = null;

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return { r, g, b };
}

function colorDistance(c1, c2) {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Generates a new color visually distinct from the previous one.
 * @param {number} threshold - Minimum distance required (0–441).
 */
function generateDistinctColor(threshold = 150) {
  let newColor = getRandomColor();

  // If there's no previous color, accept immediately
  if (!lastColor) {
    lastColor = newColor;
    return rgbToHex(newColor);
  }

  // Retry until sufficiently different
  while (colorDistance(newColor, lastColor) < threshold) {
    newColor = getRandomColor();
  }

  lastColor = newColor;
  return rgbToHex(newColor);
}

function rgbToHex({ r, g, b }) {
  return "#" + [r, g, b]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}
