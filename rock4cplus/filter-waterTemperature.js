const fs = require("fs/promises");

const os = require("os");

//ALT ER VIBECODET MED CHATGPT

// ============================================================
// INNSTILLINGER
// ============================================================

const SOURCE_FILE =
    `${os.homedir()}/hovsvannet-local/db/waterTemperatureFile.json`;

//For å legge filtrert fil i db mappen
const OUTPUT_FILE =
    `${os.homedir()}/hovsvannet-local/db/waterTemperatureFile.json`;

//For å legge filtrert fil i denne mappen
/* const OUTPUT_FILE = 
    "waterTemperatureFile.json"; */

const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 30;

const MAX_RISE_C = 5;
const MAX_RISE_MINUTES = 5;

// 0 = alle målinger
// 15 = én måling hvert 15. minutt
const SAMPLE_EVERY_MINUTES = 0;


// ============================================================
// HENT DATA
// ============================================================

async function fetchData() {
    console.log(`Leser data fra:\n${SOURCE_FILE}\n`);

    const file = await fs.readFile(SOURCE_FILE, "utf8");

    return JSON.parse(file);
}

// ============================================================
// FILTRERING
// ============================================================

function filterMeasurements(measurements) {
    const valid = [];
    const removed = [];

    for (const measurement of measurements) {

        if (!Array.isArray(measurement) || measurement.length < 2) {
            removed.push({
                measurement,
                reason: "Ugyldig format"
            });
            continue;
        }

        const timestamp = Number(measurement[0]);
        const temperature = Number(measurement[1]);

        if (
            !Number.isFinite(timestamp) ||
            !Number.isFinite(temperature)
        ) {
            removed.push({
                measurement,
                reason: "Ugyldig tallverdi"
            });
            continue;
        }

        if (temperature < MIN_TEMPERATURE) {
            removed.push({
                timestamp,
                temperature,
                reason: `Temperatur under ${MIN_TEMPERATURE} °C`
            });
            continue;
        }

        if (temperature > MAX_TEMPERATURE) {
            removed.push({
                timestamp,
                temperature,
                reason: `Temperatur over ${MAX_TEMPERATURE} °C`
            });
            continue;
        }

        let suddenRise = false;
        let comparedTo = null;

        for (let i = valid.length - 1; i >= 0; i--) {

            const previousTimestamp = valid[i][0];
            const previousTemperature = valid[i][1];

            const minutesBetween =
                (timestamp - previousTimestamp) / 60;

            if (minutesBetween > MAX_RISE_MINUTES) {
                break;
            }

            if (minutesBetween < 0) {
                continue;
            }

            const rise =
                temperature - previousTemperature;

            if (rise > MAX_RISE_C) {
                suddenRise = true;

                comparedTo = {
                    timestamp: previousTimestamp,
                    temperature: previousTemperature,
                    minutes: minutesBetween,
                    rise
                };

                break;
            }
        }

        if (suddenRise) {

            removed.push({
                timestamp,
                temperature,
                reason:
                    `Brå temperaturøkning: ` +
                    `${comparedTo.rise.toFixed(2)} °C ` +
                    `på ${comparedTo.minutes.toFixed(2)} minutter`,
                comparedTo
            });

            continue;
        }

        valid.push([
            timestamp,
            temperature
        ]);
    }

    return {
        valid,
        removed
    };
}


// ============================================================
// REDUSER ANTALL MÅLINGER
// ============================================================

function sampleMeasurements(measurements, everyMinutes) {

    if (!everyMinutes || everyMinutes <= 0) {
        return measurements;
    }

    const intervalSeconds =
        everyMinutes * 60;

    const result = [];

    let currentBucket = null;

    for (const measurement of measurements) {

        const timestamp = measurement[0];

        const bucket =
            Math.floor(timestamp / intervalSeconds);

        if (bucket !== currentBucket) {
            result.push(measurement);
            currentBucket = bucket;
        }
    }

    return result;
}


// ============================================================
// FORMATTER TID
// ============================================================

function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toISOString();
}


// ============================================================
// SKRIV UT FJERNEDE MÅLINGER
// ============================================================

function printRemoved(removed) {

    if (removed.length === 0) {
        console.log("Ingen målinger ble fjernet.\n");
        return;
    }

    console.log(
        `Fjernet ${removed.length} målinger:\n`
    );

    for (const item of removed) {

        if (item.timestamp !== undefined) {

            console.log(
                `${formatTimestamp(item.timestamp)} | ` +
                `${item.temperature} °C | ` +
                `${item.reason}`
            );

        } else {

            console.log(
                `${JSON.stringify(item.measurement)} | ` +
                `${item.reason}`
            );
        }
    }

    console.log("");
}


// ============================================================
// MAIN
// ============================================================

async function main() {

    try {

        const data = await fetchData();

        if (
            !data ||
            !Array.isArray(data.measurements)
        ) {
            throw new Error(
                "JSON-data inneholder ikke et gyldig " +
                "'measurements'-array."
            );
        }

        const originalCount =
            data.measurements.length;

        console.log(
            `Mottok ${originalCount} målinger.`
        );

        const filtered =
            filterMeasurements(data.measurements);

        printRemoved(filtered.removed);

        const sampled =
            sampleMeasurements(
                filtered.valid,
                SAMPLE_EVERY_MINUTES
            );

        // Skriv JSON med én måling per linje
        const json =
`{
  "measurements": [
${sampled.map(m => `    [${m[0]},${m[1]}]`).join(",\n")}
  ]
}`;

        await fs.writeFile(
            OUTPUT_FILE,
            json,
            "utf8"
        );

        console.log("=================================");
        console.log("Ferdig");
        console.log("=================================");
        console.log(`Opprinnelig:       ${originalCount}`);
        console.log(`Fjernet:           ${filtered.removed.length}`);
        console.log(`Etter filtrering:  ${filtered.valid.length}`);
        console.log(`Etter sampling:    ${sampled.length}`);

        if (SAMPLE_EVERY_MINUTES > 0) {
            console.log(
                `Intervall:         hvert ${SAMPLE_EVERY_MINUTES}. minutt`
            );
        } else {
            console.log(
                "Intervall:         alle målinger"
            );
        }

        console.log(
            `Fil skrevet til:   ${OUTPUT_FILE}`
        );

        console.log("=================================");

    } catch (error) {

        console.error(
            "\nFEIL:",
            error.message
        );

        process.exit(1);
    }
}

main();