const axios = require('axios');

class WeatherService {
    constructor() {
        this.apiKey = process.env.WEATHER_API_KEY;
        this.baseUrl = 'http://api.openweathermap.org/data/2.5';
    }

    async getCurrentWeather(lat, lon) {
        try {
            const response = await axios.get(`${this.baseUrl}/weather`, {
                params: {
                    lat,
                    lon,
                    appid: this.apiKey,
                    units: 'metric'
                }
            });

            return {
                temperature: response.data.main.temp,
                humidity: response.data.main.humidity,
                windSpeed: response.data.wind.speed,
                condition: response.data.weather[0].description,
                lastUpdated: new Date()
            };
        } catch (error) {
            throw new Error('Failed to fetch weather data');
        }
    }

    async getForecast(lat, lon, targetDate) {
        try {
            const response = await axios.get(`${this.baseUrl}/forecast`, {
                params: {
                    lat,
                    lon,
                    appid: this.apiKey,
                    units: 'metric'
                }
            });

            // Find forecast closest to target date
            const target = new Date(targetDate);
            const forecasts = response.data.list;

            let closestForecast = forecasts[0];
            let minDiff = Math.abs(new Date(forecasts[0].dt * 1000) - target);

            for (const forecast of forecasts) {
                const forecastDate = new Date(forecast.dt * 1000);
                const diff = Math.abs(forecastDate - target);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestForecast = forecast;
                }
            }

            return {
                temperature: closestForecast.main.temp,
                humidity: closestForecast.main.humidity,
                windSpeed: closestForecast.wind.speed,
                condition: closestForecast.weather[0].description,
                forecastDate: new Date(closestForecast.dt * 1000)
            };
        } catch (error) {
            throw new Error('Failed to fetch weather forecast');
        }
    }
}

module.exports = WeatherService;