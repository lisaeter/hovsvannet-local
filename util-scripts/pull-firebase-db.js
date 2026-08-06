// Needs firebase npm package
import { cert, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import fs from 'node:fs/promises'

// Fetch the service account key JSON file contents
import serviceAccount from "./credentials.json" with {type: "json"};

// Initialize the app with a service account, granting admin privileges
initializeApp({
  credential: cert(serviceAccount),
  databaseURL: "https://hovsvannet-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = getDatabase();
const measurements = db.ref('measurements');

// get all data, use .limitToLast(10) for testing
measurements.once('value', async (snapshot) => {
  let data = snapshot.val();
  let final_object = { measurements: [] };
  for (let measurementID in data) {
    const measurement = data[measurementID];
    final_object.measurements.push([measurement.dato, measurement.temp]);
  }
  // make output pretty, could also just use json.stringify
  const rows = final_object.measurements
    .map((measurement) => `    ${JSON.stringify(measurement)}`)
    .join(",\n");

  const text = `{\n  "measurements": [\n${rows}\n  ]\n}\n`;

  await fs.writeFile("./db/waterTemperatureFile.json", text, "utf8");
  process.exit();
}, (errorObject) => {
  console.log('The read failed: ' + errorObject.name);
});
