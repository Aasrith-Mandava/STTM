# BSA Datamap - Frontend

React-based frontend application for the BSA Datamap platform, providing an intuitive interface for data analysis and profiling.

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Table** - Data tables
- **Lucide React** - Icons

## Prerequisites

- Node.js 18+
- npm or yarn package manager

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ibx-DataMap-Copilot/client
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env  # Create .env file with your configurations
   ```

## Running the Application

### Development Mode

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
npm run build
# or
yarn build
```

### Preview Production Build

```bash
npm run preview
# or
yarn preview
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build
- `npm run test` - Run tests (placeholder)

## Project Structure

```
client/
├── public/           # Static assets
├── src/
│   ├── assets/       # Images, fonts, etc.
│   ├── components/   # Reusable UI components
│   ├── config/       # Configuration files
│   ├── data/         # Static data files
│   ├── end-points/   # API endpoint definitions
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components
│   ├── routes/       # Routing configuration
│   ├── state/        # Redux store and slices
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main App component
│   └── main.tsx      # Application entry point
├── package.json      # Dependencies and scripts
├── vite.config.ts    # Vite configuration
├── tailwind.config.js # Tailwind CSS configuration
└── tsconfig.json     # TypeScript configuration
```

## Key Features

- **Data Visualization**: Interactive charts and tables
- **File Upload**: Excel/CSV file processing
- **Real-time Updates**: Live data profiling results
- **Responsive Design**: Mobile-friendly interface
- **Type Safety**: Full TypeScript support
- **State Management**: Centralized Redux store

## Environment Variables

Create a `.env` file in the client directory:

```env
VITE_API_BASE_URL=http://localhost:8001
VITE_APP_TITLE=BSA Datamap
```

### Changing API Base URL

**File to modify**: `client/.env`

```env
# Change this line to your new API URL
VITE_REACT_API_BASE_URL=https://your-new-api-url.com
```

**Alternative locations if .env doesn't exist:**
- Check `client/src/config/` for configuration files
- Look in `client/src/end-points/` for hardcoded base URLs
- Search for `baseURL` in Axios configuration files

## Development Guidelines

- **Code Style**: Follow ESLint configuration
- **Components**: Use functional components with hooks
- **Styling**: Prefer Tailwind CSS classes
- **State**: Use Redux Toolkit for global state
- **Types**: Define TypeScript interfaces in `src/types/`

## API Integration

The frontend communicates with the backend API through:
- **Base URL**: Configured via `VITE_REACT_API_BASE_URL`
- **HTTP Client**: Axios with interceptors
- **Endpoints**: Defined in `src/end-points/`

## Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist/` folder** to your web server

## Docker Support

Build and run with Docker:

```bash
docker build -t datamap-copilot-frontend .
docker run -p 3000:80 datamap-copilot-frontend
```

## Troubleshooting

- **Port conflicts**: Change port in `vite.config.ts`
- **API connection**: Verify `VITE_API_BASE_URL` in `.env`
- **Build issues**: Clear `node_modules` and reinstall
- **TypeScript errors**: Check `tsconfig.json` configuration

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+