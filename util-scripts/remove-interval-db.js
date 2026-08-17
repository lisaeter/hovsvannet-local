// Note: This file is mostly written by AI

import fs from "fs/promises"
/**
 * Returns a copy of `entries` with the inclusive timestamp range removed.
 * Missing bounds are resolved to the timestamp of the closest entry.
 *
 * @param {Array<[number, number]>} entries Entries in ascending timestamp order.
 * @param {number} lowerBound Unix timestamp for the start of the interval.
 * @param {number} upperBound Unix timestamp for the end of the interval.
 * @returns {Array<[number, number]>} Entries outside the resolved interval.
 */
export function removeInterval(entries, lowerBound, upperBound) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  if (!Number.isFinite(lowerBound) || !Number.isFinite(upperBound)) {
    throw new TypeError('Interval bounds must be finite Unix timestamps.');
  }

  const closestTimestamp = (bound) => entries.reduce((closest, entry) => {
    const [timestamp] = entry;

    return Math.abs(timestamp - bound) < Math.abs(closest - bound)
      ? timestamp
      : closest;
  }, entries[0][0]);

  const resolvedLowerBound = closestTimestamp(lowerBound);
  const resolvedUpperBound = closestTimestamp(upperBound);
  const start = Math.min(resolvedLowerBound, resolvedUpperBound);
  const end = Math.max(resolvedLowerBound, resolvedUpperBound);

  return entries.filter(([timestamp]) => timestamp < start || timestamp > end);
}


// Written by human

async function readJSON(filePath) {
  const text = await fs.readFile(filePath, "utf-8");
  return JSON.parse(text);
}

async function writeJSON(filePath, data) {
  const text = JSON.stringify(data);
  await fs.writeFile(filePath, text, "utf8");
}

let dataFilePath = "db/waterTemperatureFile.json";
let data = await readJSON(dataFilePath);
let editedArr = data.measurements;
editedArr = removeInterval(editedArr, 1756425600, 1758665658);
let finalObject = { measurements: editedArr };
writeJSON(dataFilePath, finalObject);
