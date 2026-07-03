const fs = require('fs');
const content = fs.readFileSync('info terminable MArtine.html', 'utf-8');
if (content.includes('(Ressenti ${Math.round(cur.apparent_temperature)}°C)')) {
    console.log("Success: Current temp logic exists");
} else {
    console.log("Error: Current temp logic missing");
}
if (content.includes('<th>°C (Ress.)</th>')) {
    console.log("Success: Hourly logic exists");
} else {
    console.log("Error: Hourly logic missing");
}
if (content.includes('<th>Min/Max (Ress.)</th>')) {
    console.log("Success: Daily logic exists");
} else {
    console.log("Error: Daily logic missing");
}
