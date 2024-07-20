from flask import Flask, request, send_file, jsonify, render_template_string
import yt_dlp
import os

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    return render_template_string('''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>api-youtubii</title>
    </head>
    <body>
        <h1>api-youtubii</h1>
        <p><strong>Descrição:</strong> Esta API permite baixar áudios e vídeos do YouTube em formato mp3 ou mp4.</p>
        <p><strong>Como usar:</strong> Para baixar áudio ou vídeo, use a rota '/api/&lt;formato&gt;' com os parâmetros 'name' ou 'url'. Exemplo: /api/mp3?name=video_name ou /api/mp4?url=video_url</p>
        <p><strong>Informações:</strong> É proibido vender essa API.</p>
        <p><strong>Criador:</strong> Luanzin dev</p>
    </body>
    </html>
    ''')

@app.route('/api/<format>', methods=['GET'])
def download(format):
    if format not in ['mp3', 'mp4']:
        return jsonify({"error": "Invalid format. Use 'mp3' or 'mp4'."}), 400

    name = request.args.get('name')
    url = request.args.get('url')

    if not name and not url:
        return jsonify({"error": "Missing 'name' or 'url' parameter."}), 400

    if name:
        url = search_video(name)
        if not url:
            return jsonify({"error": "Video not found."}), 404

    filename = download_video(url, format)
    if not filename or not os.path.exists(filename):
        return jsonify({"error": "Failed to download video."}), 500

    try:
        return send_file(filename, as_attachment=True)
    finally:
        if filename and os.path.exists(filename):
            os.remove(filename)

@app.route('/link/', methods=['GET'])
def link():
    name = request.args.get('name')
    url = request.args.get('url')

    if not name and not url:
        return jsonify({"error": "Missing 'name' or 'url' parameter."}), 400

    if name:
        url = search_video(name)
        if not url:
            return jsonify({"error": "Video not found."}), 404

    # Get video info
    video_info = get_video_info(url)
    if not video_info:
        return jsonify({"error": "Failed to retrieve video information."}), 500

    return jsonify({"resultado": video_info})

def search_video(query):
    ydl_opts = {'quiet': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            search_result = ydl.extract_info(f"ytsearch:{query}", download=False)['entries'][0]
            return search_result['webpage_url']
        except Exception as e:
            print(f"Error searching video: {e}")
            return None

def download_video(url, format):
    ydl_opts = {
        'format': 'bestaudio/best' if format == 'mp3' else 'bestvideo+bestaudio',
        'outtmpl': f'%(id)s.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }] if format == 'mp3' else []
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info_dict)
            if format == 'mp3':
                filename = filename.rsplit('.', 1)[0] + '.mp3'
            return filename
    except Exception as e:
        print(f"Error downloading video: {e}")
        return None

def get_video_info(url):
    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'force_generic_extractor': True
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "título": info.get("title"),
                "thumb": info.get("thumbnail"),
                "canal": info.get("uploader"),
                "publicado": info.get("upload_date"),
                "visualizações": info.get("view_count"),
                "link": info.get("url")
            }
    except Exception as e:
        print(f"Error retrieving video information: {e}")
        return None

if __name__ == '__main__':
    app.run(debug=True)
