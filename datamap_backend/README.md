# DataMap Copilot - Backend

FastAPI backend service for the DataMap Copilot application with AI-powered data analysis and profiling capabilities.

## Tech Stack

- **FastAPI** - Web framework
- **Python 3.x** - Programming language
- **Google ADK** - Google Analytics Development Kit
- **Pandas** - Data manipulation
- **Streamlit** - Data apps
- **Uvicorn** - ASGI server

## Prerequisites

- Python 3.8+
- Virtual environment (recommended)
- Google Cloud credentials (for BigQuery integration)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ibx-DataMap-Copilot/server
   ```

2. **Create virtual environment**
   ```bash
   python -m venv env
   source env/bin/activate  # On Windows: env\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env  # Create .env file with your configurations
   ```

## Running the Application

### Option 1: Quick Start (Recommended)

```bash
chmod +x start.sh
./start.sh
```

### Option 2: Manual Start

Run in separate terminals:

**Terminal 1 - FastAPI Server:**
```bash
uvicorn api.main:app --port 8001
```

**Terminal 2 - ADK Web Interface:**
```bash
adk web
```

## API Documentation

Once the server is running, access:
- **Swagger UI**: http://localhost:8001/docs

## Project Structure

```
server/
├── agents/           # AI agents for data processing
├── api/             # FastAPI routes and models
├── config/          # Configuration settings
├── utils/           # Utility functions
├── templates/       # Excel templates
├── data/           # Data files (gitignored)
├── reports/        # Generated reports (gitignored)
└── requirements.txt # Python dependencies
```

## Key Features

- **Data Profiling**: Automated data quality analysis
- **Metadata Generation**: AI-powered metadata creation
- **Anomaly Detection**: Statistical anomaly identification
- **Smart Similarity**: Intelligent data matching
- **BigQuery Integration**: Direct database connectivity

## Development

- **Linting**: Follow PEP 8 standards
- **Testing**: Run tests with `pytest`
- **Logging**: Check logs in the `logs/` directory

## Troubleshooting

- Ensure all environment variables are set in `.env`
- Check Google Cloud credentials are properly configured
- Verify Python version compatibility (3.8+)

