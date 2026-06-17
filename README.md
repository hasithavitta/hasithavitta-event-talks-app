# BigQuery Release Notes Studio 🚀

BigQuery Release Notes Studio is a developer-centric Single-Page Application (SPA) dashboard built using **Python Flask**, **Vanilla JavaScript**, **CSS**, and **HTML**. It ingests the Google Cloud BigQuery Release Notes RSS/Atom feed, parses and segment daily notes into individual updates, and helps you format and draft tweets on X (formerly Twitter) with a single click.

---

## ✨ Features

- **Granular Updates Segmenting**: Breaks down single-day grouped entries from the Google Cloud feed into individual feature, bug fix, or announcement cards.
- **Dynamic Tweet Studio**: Click any card to load it into the Composer. Offers custom templates (`Summarize`, `Headline`, `Detailed`) and customizable chips to toggle the inclusion of dates, links, tech hashtags, and emojis.
- **Smart Character Constraint Management**: Real-time counter and SVG progress ring showing remaining characters under the X.com 280-character limit, automatically truncating drafts.
- **Speedy API Caching**: Implements a 5-minute memory cache to prevent API rate limits, with a manual refresh button to bypass and retrieve new data.
- **Responsive Theme Switching**: Supports a sleek, dark space theme by default (with neon glowing details) and a crisp, responsive light theme.
- **Local Dev Resilience**: Gracefully falls back to cached data with warnings if the external GCP feed cannot be reached.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.12, Flask, requests, feedparser
- **Frontend**: Plain Vanilla HTML5, CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla ES6 JavaScript (Fetch API, DOM Event Handlers)
- **Deployment & Automation**: GitHub CLI

---

## 📂 Project Structure

```text
├── app.py                  # Flask REST API and feed processing engine
├── templates/
│   └── index.html          # SPA Markup structure & icons
├── static/
│   ├── css/
│   │   └── style.css       # Visual styles, themes & layout spacing
│   └── js/
│       └── app.js          # App state logic, parsing & X.com integration
├── venv/                   # Python Virtual Environment
├── .gitignore              # Ignored local configurations and environments
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+ installed
- Git CLI

### Local Setup

1.  **Clone or Open project directory**:
    ```bash
    cd bq-releases-notes
    ```

2.  **Activate Virtual Environment**:
    *   **Windows (PowerShell)**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **Windows (CMD)**:
        ```cmd
        .\venv\Scripts\activate.bat
        ```
    *   **macOS/Linux**:
        ```bash
        source venv/bin/activate
        ```

3.  **Install Dependencies** (if running on a clean machine):
    ```bash
    pip install Flask requests feedparser
    ```

4.  **Run Development Server**:
    ```bash
    python app.py
    ```

5.  **Access Web Application**:
    Open your browser and navigate to: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 📬 Sharing Code on GitHub

This repository is linked to GitHub. To update or create changes:

1.  Stage and commit updates:
    ```bash
    git add .
    git commit -m "Your description of updates"
    ```
2.  Push to main branch:
    ```bash
    git push origin main
    ```
