const fs = require('fs');
let content = fs.readFileSync('info terminable MArtine.html', 'utf8');

// Fix compass arrow translation in JS
content = content.replace(
    /compassArrow\.style\.transform = `translate\(-50%, -100%\) rotate\(\$\{viewAzimuth\}deg\)`;/,
    "compassArrow.style.transform = `translateX(-50%) rotate(${viewAzimuth}deg)`;"
);

fs.writeFileSync('info terminable MArtine.html', content);
