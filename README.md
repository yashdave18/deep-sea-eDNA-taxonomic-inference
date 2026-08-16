# ABYSS — Deep-Sea eDNA Classification Platform

AI-powered environmental DNA (eDNA) classification system for deep-sea biodiversity analysis. Upload FASTA sequences to classify reads, detect novel taxa, and compare biodiversity across samples.

## Features

- **Reference-Free Classification**: Combines fine-tuned DNABERT-S embeddings with FAISS reference matching
- **Novelty Detection**: UMAP and HDBSCAN clustering to flag reads that don't match known references
- **Confidence-Weighted Abundance**: Relative abundance estimates weighted by classification confidence
- **Cross-Sample Comparison**: Compare taxa distribution across multiple samples in heatmap view
- **Interactive Visualizations**: UMAP scatter plots, abundance charts, and taxonomy donut charts

## Tech Stack

### Backend
- Python 3.9+
- FastAPI
- Supabase (PostgreSQL)
- NumPy, Biopython
- FAISS (for similarity search)

### Frontend
- React 18
- Vite
- React Router
- Plotly.js (for charts)
- Supabase Auth

## Prerequisites

- Python 3.9 or higher
- Node.js 16+ and npm
- Supabase account (free tier works)
- Git

## Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SIH2026
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API and note down:
   - Project URL
   - Anon Key
   - Service Role Key
   - JWT Secret

3. Run the SQL migration to create required tables:

```sql
-- Create samples table
CREATE TABLE samples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    read_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create taxa_calls table
CREATE TABLE taxa_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    read_id TEXT NOT NULL,
    taxonomy JSONB,
    confidence FLOAT,
    is_novel BOOLEAN DEFAULT FALSE,
    deepest_rank TEXT,
    nearest_known_relative TEXT,
    umap_x FLOAT,
    umap_y FLOAT,
    embedding_cluster_id INTEGER
);

-- Create abundance table
CREATE TABLE abundance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    taxon TEXT NOT NULL,
    read_count INTEGER NOT NULL,
    relative_abundance_pct FLOAT NOT NULL,
    avg_confidence FLOAT NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_samples_user_id ON samples(user_id);
CREATE INDEX idx_samples_created_at ON samples(created_at DESC);
CREATE INDEX idx_taxa_calls_sample_id ON taxa_calls(sample_id);
CREATE INDEX idx_abundance_sample_id ON abundance(sample_id);
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
MAX_UPLOAD_BYTES=104857600
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://127.0.0.1:8000
```

## Running the Project

### Start the Backend

```bash
cd backend
# Activate virtual environment if not already active
python -m uvicorn app.main:app --reload --port 8000
```

The backend will run on `http://127.0.0.1:8000`

### Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is in use)

### Access the Application

Open your browser and navigate to the frontend URL (usually `http://localhost:5173`)

## Usage

### 1. Sign In

- Click "Sign In" to authenticate with Supabase (email/password or OAuth)

### 2. Upload a Sample

- Navigate to the Upload page
- Drag and drop a FASTA file (.fasta, .fa, or .fna) or click to select
- Enter a sample name
- Click "Upload Sample"
- Wait 4-10 seconds for processing (simulated delay)

### 3. View Results

- Click on a sample card to view detailed results
- Explore:
  - Summary statistics (total reads, novel candidates)
  - UMAP scatter plot of novel candidates
  - Taxonomic abundance chart
  - Taxonomy donut chart
  - Full taxa table

### 4. Compare Samples

- Click "Compare Samples" on the dashboard
- View a heatmap comparing taxa across your samples
- Darker cells indicate higher relative abundance

### 5. Delete Samples

- Click the trash icon on any sample card
- Confirm deletion to remove the sample and all associated data

## Project Structure

```
SIH2026/
├── backend/
│   ├── app/
│   │   ├── auth.py              # JWT authentication
│   │   ├── config.py            # Configuration settings
│   │   ├── main.py              # FastAPI application entry
│   │   ├── ml/
│   │   │   ├── pipeline_runner.py  # Classification pipeline
│   │   │   └── row_builders.py     # Supabase row builders
│   │   ├── routers/
│   │   │   ├── pipeline.py       # Upload and results endpoints
│   │   │   └── samples.py        # Sample CRUD endpoints
│   │   └── supabase_client.py   # Supabase client
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── charts/              # Plotly chart components
│   │   ├── components/          # Reusable UI components
│   │   ├── contexts/            # React contexts (Auth)
│   │   ├── lib/                 # API client
│   │   ├── pages/               # Page components
│   │   ├── App.jsx              # Main app with routing
│   │   └── index.css            # Global styles
│   ├── package.json
│   └── .env
├── model/
│   └── demo_results.pkl         # Demo classification results
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/callback` - Supabase auth callback

### Samples
- `GET /samples/` - List user's samples
- `GET /samples/{sample_id}` - Get sample details
- `DELETE /samples/{sample_id}` - Delete a sample

### Pipeline
- `POST /pipeline/upload` - Upload FASTA and run classification
- `GET /pipeline/results/{sample_id}` - Get taxa calls
- `GET /pipeline/abundance/{sample_id}` - Get abundance data
- `GET /pipeline/novel/{sample_id}` - Get novel candidates
- `GET /pipeline/compare` - Compare samples across all user's samples

## Development Notes

- The pipeline currently runs in simulation mode for demo purposes
- Processing time is randomly set between 4-10 seconds
- Abundance percentages are randomized with no duplicates for variety
- All data is stored in Supabase PostgreSQL
- Frontend uses the existing Abyss dark theme (deep-sea aesthetic)

## Troubleshooting

### CORS Errors
If you encounter CORS errors, ensure the backend CORS middleware includes your frontend URL in `allow_origins`.

### Supabase Connection Issues
- Verify your `.env` files have correct Supabase credentials
- Check that your Supabase project is active
- Ensure the SQL migration has been run

### Frontend Build Errors
- Delete `node_modules` and run `npm install` again
- Clear your browser cache

## License

This project is developed for the Smart India Hackathon (SIH) 2026.
