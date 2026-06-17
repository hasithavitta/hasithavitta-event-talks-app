import re
import time
import requests
import feedparser
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache to prevent hitting Google's servers on every page load
cache = {
    "data": None,
    "timestamp": 0,
    "ttl": 300  # 5 minutes
}

def clean_html_for_excerpt(html_text):
    """
    Rough HTML strip to generate clean plain text summaries for Tweet drafts.
    Deep cleaning and formatting is also done on the frontend.
    """
    # Replace headers with spaces
    text = re.sub(r'<h[1-6][^>]*>', ' ', html_text)
    text = re.sub(r'</h[1-6]>', ': ', text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Normalize whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def fetch_and_parse_feed():
    try:
        # Fetch the feed
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse using feedparser
        feed = feedparser.parse(response.content)
        
        if not feed.entries:
            return None, "No entries found in the feed."
            
        updates = []
        for entry_idx, entry in enumerate(feed.entries):
            date_str = entry.get('title', 'Unknown Date')
            entry_link = entry.get('link', '')
            timestamp = entry.get('updated') or entry.get('published') or ''
            
            content_html = ""
            if 'content' in entry:
                content_html = entry.content[0].value
            elif 'summary' in entry:
                content_html = entry.summary
                
            # Parse individual items based on <h3> tags
            parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html, flags=re.IGNORECASE)
            
            if len(parts) > 1:
                # Text before the first H3 is usually empty, but capture it if not
                pre_content = parts[0].strip()
                if pre_content and len(pre_content) > 10:
                    item_id = f"{entry.get('id', 'item')}_pre"
                    plain_text = clean_html_for_excerpt(pre_content)
                    updates.append({
                        "id": item_id,
                        "date": date_str,
                        "timestamp": timestamp,
                        "type": "General",
                        "content": pre_content,
                        "plain_text": plain_text,
                        "link": entry_link
                    })
                
                # Pairwise H3 text and following content
                for j in range(1, len(parts), 2):
                    update_type = parts[j].strip()
                    update_content = parts[j+1].strip() if j+1 < len(parts) else ""
                    
                    # Create a unique ID for each segmented update item
                    item_id = f"{entry.get('id', 'item')}_{j//2}"
                    plain_text = clean_html_for_excerpt(update_content)
                    
                    updates.append({
                        "id": item_id,
                        "date": date_str,
                        "timestamp": timestamp,
                        "type": update_type,
                        "content": update_content,
                        "plain_text": plain_text,
                        "link": entry_link
                    })
            else:
                # If there are no H3 tags, treat the whole content as a general update
                item_id = f"{entry.get('id', 'item')}_0"
                plain_text = clean_html_for_excerpt(content_html)
                updates.append({
                    "id": item_id,
                    "date": date_str,
                    "timestamp": timestamp,
                    "type": "Update",
                    "content": content_html,
                    "plain_text": plain_text,
                    "link": entry_link
                })
                
        parsed_data = {
            "status": "success",
            "feed_title": feed.feed.get('title', 'BigQuery - Release Notes'),
            "feed_link": feed.feed.get('link', 'https://cloud.google.com/bigquery/docs/release-notes'),
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updates": updates
        }
        return parsed_data, None
        
    except Exception as e:
        return None, str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/updates')
def get_updates():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    # Return from cache if valid and refresh not requested
    if not force_refresh and cache["data"] and (current_time - cache["timestamp"] < cache["ttl"]):
        return jsonify(cache["data"])
        
    # Fetch fresh data
    data, error = fetch_and_parse_feed()
    if error:
        # If fetch fails but we have cached data, return cached data as a fallback with a warning
        if cache["data"]:
            stale_data = cache["data"].copy()
            stale_data["warning"] = f"Failed to fetch fresh data: {error}. Serving cached data."
            return jsonify(stale_data)
        return jsonify({"status": "error", "message": error}), 500
        
    # Update cache
    cache["data"] = data
    cache["timestamp"] = current_time
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
