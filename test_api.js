const https = require('https');
const url = 'https://api.open-meteo.com/v1/forecast?latitude=46.76&longitude=-71.26&current=temperature_2m,precipitation,snowfall,cloud_cover,weather_code,windspeed_10m,winddirection_10m,wind_gusts_10m,visibility,surface_pressure,relative_humidity_2m,cape&hourly=temperature_2m,precipitation,snowfall,weather_code,windspeed_10m,winddirection_10m,wind_gusts_10m,visibility,cape&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,windspeed_10m_max,windgusts_10m_max,winddirection_10m_dominant,precipitation_sum,snowfall_sum&forecast_days=7&timezone=America%2FToronto&timeformat=unixtime&wind_speed_unit=kn';

https.get(url, (res) => {
  console.log('Status Code:', res.statusCode);
  res.on('data', (d) => {
    console.log('Got data length:', d.length);
  });
}).on('error', (e) => {
  console.error('API ERROR:', e);
});
