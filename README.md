# HUD for Viture

A minimalist heads-up display interface for daily information, designed to provide essential information at a glance.

## Features

- **Weather Widget**: Real-time weather data from Open-Meteo API with forecast
- **System Status**: Battery, network, and storage information
- **Music Player**: Play local audio files with basic controls
- **Notification Center**: Display system notifications
- **Time Display**: Current time and date
- **Nearby POI**: Shows points of interest near your location using OpenStreetMap
- **Sniper Scope**: Military-style scope with mil scale for distance estimation
- **Compass**: Shows your current heading and cardinal direction
- **Pure Black Background**: Optimized for OLED displays for transparency effect

## Technologies Used

- React 18
- TypeScript
- Tailwind CSS
- Lucide React Icons
- Web APIs (Battery, Geolocation, Storage, DeviceOrientation)
- OpenStreetMap (nearby POI)
- Overpass API (weather)

## Deployment to GitHub Pages

This project is configured for deployment to GitHub Pages using GitHub Actions:

1. Fork or clone this repository
2. Push to your main branch
3. GitHub Actions will automatically build and deploy to GitHub Pages

## Local Development

1. Clone the repository
2. Install dependencies with `npm install`
3. Run the development server with `npm start`
4. Build for production with `npm run build`

## Usage

- Use arrow keys to navigate between widgets
- Press Enter to interact with the focused widget
- The interface is designed for pure black backgrounds to work with OLED displays

## Credits

This project was developed with assistance from `v0.dev`, Vercel's AI-powered development tool. `v0.dev` helped with:

- Creating the UI components and layout
- Implementing responsive design patterns
- Setting up the service worker for offline capability
- Integrating with Web APIs for system information
- Structuring the project for maintainability

## License

MIT

