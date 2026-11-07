# AMRS User Guide

## Getting Started

### Installation
```bash
# Clone the repository
git clone https://github.com/manthanrailkar/AMRS.git
cd AMRS

# Install with development dependencies
pip install -e .[dev]
```

### CLI Usage
```bash
# Verify CLI version
amrs --version

# Run diagnosis on a failure scenario
amrs diagnose --scenario s1_overfit

# Run targeted recovery and verification gate
amrs recover --scenario s1_overfit --arch resnet18_cifar

# Replay metrics through live training monitor
amrs monitor-replay --scenario s1_overfit

# Run benchmarks against baselines
amrs benchmark --scenarios s1_overfit s2_miscalibration
```

### Web Dashboard
```bash
# Start FastAPI backend
make api

# Start Next.js frontend (in separate terminal)
make web
```
Navigate to `http://localhost:3000` to interact with the recovery workspace.

