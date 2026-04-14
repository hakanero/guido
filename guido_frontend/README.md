# 🦉 Guido — Frontend

This is an interactive web application that provides voice-guided tours using real-time location data. It combines mapping, geolocation, and AI-generated narration to turn your Google Maps into a smart travel companion.

---

## ✨ Key Features

- 🗺️ **Interactive Map Interface** — built with **React Leaflet** to display user location and navigation path in real time  
- 🎙️ **AI Voice Narration** — integrates with **ElevenLabs** for lifelike voiceovers  
- 🤖 **Dynamic Narration Content** — powered by **Gemini API**, which generates personalized storytelling based on user location  
- 📍 **Real-Time Geolocation** — continuously tracks and centers on the user’s position  
- 📱 **Mobile Design** — optimized for mobile.                    
  

---

## 🧰 Tech Stack

| Category | Technology |

|-----------|-------------|

| Framework | **React + TypeScript** |

| Build Tool | **Vite** |

| Mapping | **Leaflet / React-Leaflet** |

| Styling | **Tailwind CSS** |

| Animation | **CSS Keyframes / Framer Motion** |

| Voice | **ElevenLabs API** |

| AI Text | **Gemini API (Google Generative AI)** |

---

## ⚙️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/hakanero/guido.git
   cd guido/guido_frontend
   ```
2. **Configure environment variables**                    
  Create a .env file in the frontend directory and add:
  ```bash
  VITE_GEMINI_API_KEY=your_gemini_api_key
  VITE_ELEVENLABS_API_KEY=your_elevenlabs_api_key
  VITE_BACKEND_URL=https://your-backend-server.com
  ```
4. **Start Development Server**
```bash
npm run dev
```

## 🗂️ Project Structure

```
frontend/
│
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   ├── App.tsx
│   └── main.tsx
│
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🧩 Core Components
**NavigationPage.tsx**

* Displays the user’s position on the map

* Integrates location tracking (useLocation)

* Syncs voice narration state (useVoiceGuide)

* Controls mascot animation dynamically through the useMascotIcon hook

**useMascotIcon()**

* Creates a custom animated Leaflet marker using a DivIcon

* Animates the mascot with CSS keyframes:
  * bounce, ring, and bob animations for speaking state
  * Pause badge visibility for paused state
  


