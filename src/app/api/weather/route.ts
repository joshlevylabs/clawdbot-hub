import { NextResponse } from 'next/server';

// WMO Weather codes to descriptions and icons
const weatherCodes: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Depositing rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌧️' },
  53: { description: 'Moderate drizzle', icon: '🌧️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  71: { description: 'Slight snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '🌨️' },
  75: { description: 'Heavy snow', icon: '🌨️' },
  77: { description: 'Snow grains', icon: '🌨️' },
  80: { description: 'Slight rain showers', icon: '🌦️' },
  81: { description: 'Moderate rain showers', icon: '🌦️' },
  82: { description: 'Violent rain showers', icon: '🌦️' },
  85: { description: 'Slight snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '🌨️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

function getWeatherInfo(code: number) {
  return weatherCodes[code] || { description: 'Unknown', icon: '❓' };
}

function formatHour(isoTime: string) {
  const date = new Date(isoTime);
  const hour = date.getHours();
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  return hour > 12 ? `${hour - 12}pm` : `${hour}am`;
}

function formatDay(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export async function GET() {
  try {
    // Los Angeles coordinates
    const lat = 34.05;
    const lon = -118.24;
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature&hourly=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Los_Angeles&forecast_days=7`;
    
    const response = await fetch(url, { next: { revalidate: 900 } }); // Cache for 15 minutes
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const data = await response.json();
    
    // Get current hour index for hourly data
    const now = new Date();
    const currentHour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];
    
    // Find today's start index in hourly data
    const todayStartIndex = data.hourly.time.findIndex((t: string) => t.startsWith(todayStr));
    
    // Get remaining hours today + some tomorrow (next 24 hours from now)
    const hourlyStartIndex = todayStartIndex + currentHour;
    const hourlyData = [];
    for (let i = 0; i < 24 && (hourlyStartIndex + i) < data.hourly.time.length; i++) {
      const idx = hourlyStartIndex + i;
      hourlyData.push({
        time: formatHour(data.hourly.time[idx]),
        temp: Math.round(data.hourly.temperature_2m[idx]),
        humidity: data.hourly.relative_humidity_2m[idx],
        ...getWeatherInfo(data.hourly.weather_code[idx]),
      });
    }
    
    // Daily forecast
    const dailyData = data.daily.time.map((date: string, i: number) => ({
      date: formatDay(date),
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      precipChance: data.daily.precipitation_probability_max?.[i] || 0,
      ...getWeatherInfo(data.daily.weather_code[i]),
    }));
    
    // Current weather
    const current = {
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      wind: Math.round(data.current.wind_speed_10m),
      ...getWeatherInfo(data.current.weather_code),
      location: 'Los Angeles',
      updatedAt: new Date().toISOString(),
    };
    
    return NextResponse.json({
      current,
      hourly: hourlyData,
      daily: dailyData,
    });
    
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
