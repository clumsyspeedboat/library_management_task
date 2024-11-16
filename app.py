# app.py

from gemini import init_gemini, generate_description, init_chat, send_chat_message
from flask import Flask, render_template, jsonify, request
from rdflib import Graph, Namespace, RDF, URIRef
import configparser, logging
from flask_cors import CORS

app = Flask(__name__, static_url_path='/static', static_folder='static')
CORS(app)

# Configure logging to DEBUG level for detailed logs
logging.basicConfig(
    level=logging.DEBUG,  # Changed from INFO to DEBUG
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Load the configuration from the config.ini file
config = configparser.ConfigParser()
config.read('config.ini')

# Get the API key and URL from the configuration
try:
    GEMINI_API_KEY = config.get('API', 'GEMINI_API_KEY')
    GEMINI_API_URL = config.get('API', 'GEMINI_API_URL')
    logging.info("Gemini API configuration loaded successfully.")

    # Initialize the Gemini API
    init_gemini(
        api_key=GEMINI_API_KEY,
    )
except Exception as e:
    logging.error("Error reading config.ini: %s", e)
    GEMINI_API_KEY = None
    GEMINI_API_URL = None

# Route to serve the home page
@app.route('/')
def home():
    return render_template('index.html')

# Route to serve viewer.html
@app.route('/viewer.html')
def viewer():
    return render_template('viewer.html')

# Route to serve chatbot.html
@app.route('/chatbot.html')
def chatbot():
    return render_template('chatbot.html')

@app.route('/api/chat/init', methods=['GET'])
def get_chat_init():
    logging.debug("Received chat init request.")

    try:
        return jsonify({
            'response': init_chat(),
        })
    except Exception as e:
        return jsonify({
            'error': 'An error occurred',
            'message': str(e),
        }), 500

@app.route('/api/chat/message', methods=['GET'])
def get_chat_message():
    message = request.args.get('message')
    logging.debug(f"Received chat message: {message}")  # Changed to DEBUG

    try:
        return jsonify({
            'response': send_chat_message(
                message=message,
            ),
        })
    except Exception as e:
        return jsonify({
            'error': 'An error occurred',
            'message': str(e),
        }), 500

# API route to fetch description from Gemini API
@app.route('/api/description', methods=['GET'])
def get_description():
    entity_name = request.args.get('name')
    logging.debug(f"Received request for entity name: {entity_name}")  # Changed to DEBUG

    if not entity_name:
        logging.warning("Missing entity name in request.")
        return jsonify({'error': 'Missing entity name'}), 400

    if not GEMINI_API_URL or not GEMINI_API_KEY:
        logging.error("Gemini API configuration missing.")
        return jsonify({'error': 'Server configuration error'}), 500

    try:
        return jsonify({
            'description': get_description(
                entity_name=entity_name,
            ),
        })
    except Exception as e:
        return jsonify({
            'error': 'An error occurred',
            'message': str(e),
        }), 500

# New API route to fetch ontology data for graph view
@app.route('/api/ontology_graph', methods=['GET'])
def get_ontology_graph():
    ontology_file = 'docker/import/ontology.ttl'  # Path to your ontology file
    g = Graph()
    try:
        g.parse(ontology_file, format='turtle')
        logging.info("Ontology file parsed successfully.")
    except Exception as e:
        logging.error(f"Failed to parse ontology file: {e}")
        return jsonify({'error': 'Failed to parse ontology file'}), 500

    EX = Namespace("http://example.org/library#")

    nodes = []
    edges = []
    node_ids = set()

    # Extract Books, Authors, Publishers, Genres as nodes
    for s, p, o in g:
        if p == RDF.type:
            if o == EX.Book:
                title = g.value(s, EX.title)
                nodes.append({"id": str(s), "label": str(title), "group": "Book"})
            elif o == EX.Author or o == EX.Publisher or o == EX.Genre:
                name = g.value(s, EX.name)
                node_type = o.split('#')[-1]  # Author, Publisher, Genre
                nodes.append({"id": str(s), "label": str(name), "group": node_type})
            elif o == EX.Library:
                name = g.value(s, EX.name) if g.value(s, EX.name) else "Library"
                nodes.append({"id": str(s), "label": str(name), "group": "Library"})

    # Extract relationships as edges
    for s, p, o in g:
        if p in [EX.HAS_AUTHOR, EX.HAS_PUBLISHER, EX.HAS_GENRE]:
            relationship = p.split('#')[-1]  # HAS_AUTHOR, etc.
            edges.append({
                "from": str(s),
                "to": str(o),
                "label": relationship
            })
        elif p == EX.CONTAINS and isinstance(o, URIRef):
            # Assuming CONTAINS relates Library to Book
            edges.append({
                "from": str(s),
                "to": str(o),
                "label": "CONTAINS"
            })

    # Add Library node if not present
    library_uri = "http://example.org/library#MyLibrary"
    if not any(node['id'] == library_uri for node in nodes):
        nodes.append({"id": library_uri, "label": "MyLibrary", "group": "Library"})

    return jsonify({"nodes": nodes, "edges": edges})

if __name__ == '__main__':
    app.run(debug=True)
