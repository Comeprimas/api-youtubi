from flask import Flask, request, send_file, jsonify
import yt_dlp
import os

app = Flask(__name__)

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
    except Exception as e:
        print(f"Error sending file: {e}")
        return jsonify({"error": "Failed to send file."}), 500
    finally:
        if filename and os.path.exists(filename):
            os.remove(filename)

if __name__ == '__main__':
    app.run(debug=True)
