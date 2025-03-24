# Map Assist

Map Assist is a location-aware chat application designed to help users navigate and explore their surroundings using natural language. By integrating mapping services, mobility data, and advanced language models, Map Assist delivers intelligent, context-aware responses to your location-based queries.

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Demo](#demo)
- [Usage Examples](#usage-examples)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)

## Features

- **Interactive Map Interface**  
  View your current location and planned routes on an OpenStreetMap-powered map.
  
- **Natural Language Chat**  
  Ask questions about nearby places, directions, and mobility options using everyday language.
  
- **Location Discovery**  
  Easily find points of interest, amenities, and services in your vicinity.
  
- **Accessibility Information**  
  Get details about wheelchair accessibility and other user-centric features.

## Technology Stack

- **Frontend:**  
  - Next.js 15  
  - React 19  
  - TailwindCSS

- **Mapping:**  
  - Leaflet.js powered by OpenStreetMap

- **Routing:**  
  - OSRM (Open Source Routing Machine)

- **Language Model:**  
  - Hugging Face API (using Mistral-7B-Instruct)

- **Location Data:**  
  - OpenStreetMap via Overpass API and Nominatim

## Getting Started

### Prerequisites

- **Node.js:** Version 18 or higher  
- **Package Manager:** npm, yarn, or pnpm  
- **API Token:** A valid Hugging Face API token for language model access

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/ShivAkash/Map-Assist.git
   cd Map-Assist
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure Environment Variables:**

   Create a .env.local file in the root directory and add your API tokens:

   ```env
   HUGGINGFACE_API_TOKEN=your-hugging-face-api-token
   ```

4. **Start the Development Server:**

   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **View the Application:**

   Open your browser and navigate to http://localhost:3000.

## Demo
https://github.com/user-attachments/assets/197ea83b-3f21-47b7-863b-c5e9f80c4c56

## Usage Examples

Use the chat interface to ask natural language queries such as:

### Finding Nearby Places:
"Where is the nearest coffee shop?"

### Getting Directions:
"How do I get to the train station?"

### Route Options:
"Show me bike routes to the park"

### Accessibility Information:
"Find accessible restaurants nearby"

### Sustainability Queries:
"What's the most sustainable way to reach the museum?"


## Contributing

Contributions are welcome! Follow these steps to contribute:

1. **Fork the Repository**

2. **Create a Feature Branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit Your Changes:**

   ```bash
   git commit -m "Add some fix/feature"
   ```

4. **Push to Your Branch:**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request:**
   Submit a pull request outlining your changes.


## Acknowledgments

- OpenStreetMap: For the map data.
- OSRM: For providing the routing engine.
- Hugging Face: For access to the language model API.

