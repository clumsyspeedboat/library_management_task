# app.py

from flask import Flask, render_template, jsonify, request
import configparser
import requests
import logging
from flask_cors import CORS
from rdflib import Graph, Namespace, RDF, Literal, URIRef, XSD
import uuid
from datetime import datetime, timedelta

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
except Exception as e:
    logging.error("Error reading config.ini: %s", e)
    GEMINI_API_KEY = None
    GEMINI_API_URL = None

# Namespace
EX = Namespace("http://example.org/library#")

# Route to serve the home page
@app.route('/')
def home():
    return render_template('index.html')

# Route to serve viewer.html
@app.route('/viewer.html')
def viewer():
    return render_template('viewer.html')

# API route to fetch description from Gemini API
@app.route('/api/description', methods=['GET'])
def get_description():
    entity_name = request.args.get('name')
    entity_type = request.args.get('type')  # Added to determine the entity type
    logging.debug(f"Received request for entity name: {entity_name}, type: {entity_type}")  # Changed to DEBUG

    if not entity_name or not entity_type:
        logging.warning("Missing entity name or type in request.")
        return jsonify({'error': 'Missing entity name or type'}), 400

    if not GEMINI_API_URL or not GEMINI_API_KEY:
        logging.error("Gemini API configuration missing.")
        return jsonify({'error': 'Server configuration error'}), 500

    # Prepare the JSON payload with explicit instructions based on entity type
    if entity_type.lower() == 'book':
        instructions = (
            f"Provide a comprehensive description of the book titled '{entity_name}'. "
            "Include details about its setting, main characters, plot, themes, key concepts, and its influence or impact on literature. "
            "Ensure the description is engaging and suitable for a library catalog. "
            "Do not include any concluding remarks, questions, or notes."
        )
    elif entity_type.lower() == 'author':
        instructions = (
            f"Provide a detailed biography of the author '{entity_name}'. "
            "Include information about their early life, education, major works, writing style, notable achievements, and contributions to literature. "
            "Ensure the biography is informative and suitable for a library catalog. "
            "Do not include any concluding remarks, questions, or notes."
        )
    elif entity_type.lower() == 'publisher':
        instructions = (
            f"Provide an overview of the publisher '{entity_name}'. "
            "Include details about its history, notable publications, market presence, and contributions to the publishing industry. "
            "Ensure the overview is informative and suitable for a library catalog. "
            "Do not include any concluding remarks, questions, or notes."
        )
    elif entity_type.lower() == 'genre':
        instructions = (
            f"Provide a comprehensive description of the genre '{entity_name}'. "
            "Include its defining characteristics, typical themes, representative works, and its evolution over time. "
            "Ensure the description is informative and suitable for a library catalog. "
            "Do not include any concluding remarks, questions, or notes."
        )
    else:
        instructions = (
            f"Provide a detailed description of '{entity_name}'. "
            "Include relevant information based on its classification within a library management system. "
            "Ensure the description is informative and suitable for a library catalog. "
            "Do not include any concluding remarks, questions, or notes."
        )

    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": instructions
                    }
                ]
            }
        ]
    }

    # Construct the API URL with the API key as a query parameter
    api_url_with_key = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"

    headers = {
        "Content-Type": "application/json"
    }

    # Log the API URL and payload for debugging
    logging.debug(f"API URL: {api_url_with_key}")
    logging.debug(f"Payload: {payload}")

    try:
        # Make the POST request to the Gemini API
        response = requests.post(
            api_url_with_key,  # Include the API key in the URL
            headers=headers,
            json=payload,
            timeout=10  # seconds
        )
        logging.debug(f"Gemini API response status: {response.status_code}")  # Changed to DEBUG

        if response.status_code != 200:
            logging.error(f"Failed to fetch description from Gemini API. Status code: {response.status_code}")
            logging.error(f"Response content: {response.text}")
            return jsonify({
                'error': 'Failed to fetch description from Gemini API',
                'status_code': response.status_code,
                'response': response.text
            }), 500

        response_data = response.json()
        # Extract the description from the response
        description = response_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', 'No description available.')
        logging.debug(f"Fetched description: {description}")  # Changed to DEBUG

        return jsonify({'description': description})

    except requests.exceptions.RequestException as e:
        logging.error(f"Exception during Gemini API request: {e}")
        return jsonify({'error': 'Failed to connect to Gemini API', 'message': str(e)}), 500
    except ValueError as e:
        logging.error(f"JSON decoding failed: {e}")
        return jsonify({'error': 'Invalid JSON response from Gemini API', 'message': str(e)}), 500
    except Exception as e:
        logging.exception(f"Unexpected error: {e}")
        return jsonify({'error': 'An unexpected error occurred', 'message': str(e)}), 500


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

    nodes = []
    edges = []

    # Extract all nodes and their labels
    for s, p, o in g:
        if p == RDF.type:
            if o == EX.Book:
                title = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(title), "group": "Book"})
            elif o == EX.Author:
                name = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(name), "group": "Author"})
            elif o == EX.Publisher:
                name = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(name), "group": "Publisher"})
            elif o == EX.Genre:
                name = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(name), "group": "Genre"})
            elif o == EX.Library:
                name = g.value(s, EX.HAS_NAME) if g.value(s, EX.HAS_NAME) else "Library"
                nodes.append({"id": str(s), "label": str(name), "group": "Library"})
            elif o == EX.User:
                name = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(name), "group": "User"})
            elif o == EX.Student:
                name = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(name), "group": "Student"})
            elif o == EX.Faculty:
                name = g.value(s, EX.HAS_NAME)
                nodes.append({"id": str(s), "label": str(name), "group": "Faculty"})
            elif o == EX.BorrowingEvent:
                date = g.value(s, EX.HAS_DATE)
                label = f"Borrowing Event ({date})" if date else "Borrowing Event"
                nodes.append({"id": str(s), "label": label, "group": "BorrowingEvent"})

    # Extract edges (relationships)
    for s, p, o in g:
        if p in [EX.HAS_AUTHOR, EX.HAS_PUBLISHER, EX.HAS_GENRE]:
            relationship = p.split('#')[-1]
            edges.append({"from": str(s), "to": str(o), "label": relationship})
        elif p == EX.CONTAINS:
            edges.append({"from": str(s), "to": str(o), "label": "CONTAINS"})
        elif p == EX.HAS_BORROWER:
            edges.append({"from": str(s), "to": str(o), "label": "HAS_BORROWER"})
        elif p == EX.HAS_BOOK:
            edges.append({"from": str(s), "to": str(o), "label": "HAS_BOOK"})
        elif p == EX.HAS_DATE:
            edges.append({"from": str(s), "to": str(o), "label": f"DATE: {o}"})
        elif p == EX.state:
            pass  # State is a property of the book, not represented in the graph

    return jsonify({"nodes": nodes, "edges": edges})

# API endpoint to fetch books data from ontology.ttl
@app.route('/api/books', methods=['GET'])
def get_books():
    try:
        ontology_file = 'docker/import/ontology.ttl'
        g = Graph()
        g.parse(ontology_file, format='turtle')

        books = []

        for book in g.subjects(RDF.type, EX.Book):
            book_id = str(book)
            title = str(g.value(book, EX.HAS_NAME))
            author_uri = g.value(book, EX.HAS_AUTHOR)
            publisher_uri = g.value(book, EX.HAS_PUBLISHER)
            genre_uri = g.value(book, EX.HAS_GENRE)
            state = str(g.value(book, EX.state))

            # Get names
            author_name = str(g.value(author_uri, EX.HAS_NAME)) if author_uri else ''
            publisher_name = str(g.value(publisher_uri, EX.HAS_NAME)) if publisher_uri else ''
            genre_name = str(g.value(genre_uri, EX.HAS_NAME)) if genre_uri else ''

            # Check if the book is borrowed
            borrowed = False
            borrower_name = ''
            borrower_type = ''
            borrow_date = ''
            return_date = ''
            for event in g.subjects(RDF.type, EX.BorrowingEvent):
                event_book = g.value(event, EX.HAS_BOOK)
                if event_book == book:
                    borrowed = True
                    borrower_uri = g.value(event, EX.HAS_BORROWER)
                    borrower_name = str(g.value(borrower_uri, EX.HAS_NAME))
                    borrow_date = str(g.value(event, EX.HAS_DATE))
                    # Determine borrower type
                    if (borrower_uri, RDF.type, EX.Student) in g:
                        borrower_type = 'Student'
                    elif (borrower_uri, RDF.type, EX.Faculty) in g:
                        borrower_type = 'Faculty'
                    else:
                        borrower_type = 'User'
                    # Assuming return date is 3 months after borrow date
                    if borrow_date:
                        return_date = str(datetime.strptime(borrow_date, "%Y-%m-%d").date() + timedelta(days=90))
                    break

            books.append({
                'id': book_id,
                'title': title,
                'author': {'id': str(author_uri), 'name': author_name},
                'publisher': {'id': str(publisher_uri), 'name': publisher_name},
                'genre': {'id': str(genre_uri), 'name': genre_name},
                'state': state,
                'borrowed': borrowed,
                'borrower_name': borrower_name,
                'borrower_type': borrower_type,
                'borrow_date': borrow_date,
                'return_date': return_date
            })

        return jsonify({'books': books})

    except Exception as e:
        logging.error(f"Error fetching books: {e}")
        return jsonify({'error': 'Failed to fetch books', 'details': str(e)}), 500

# Endpoint to handle borrowing a book
@app.route('/api/borrow', methods=['POST'])
def borrow_book():
    data = request.json
    book_id = data.get('book_id')  # Book URI
    borrower_name = data.get('borrower_name')  # Name of the borrower
    borrower_type = data.get('borrower_type')  # 'Student' or 'Faculty'
    borrow_date = data.get('borrow_date')  # Date in YYYY-MM-DD format

    if not book_id or not borrower_name or not borrow_date or not borrower_type:
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        ontology_file = 'docker/import/ontology.ttl'
        g = Graph()
        g.parse(ontology_file, format='turtle')

        # Bind namespace
        g.bind("ex", EX)

        # Generate unique IDs
        event_id = f"be_{uuid.uuid4()}"
        borrower_id = f"u_{uuid.uuid4()}"

        event_uri = EX[event_id]
        borrower_uri = EX[borrower_id]

        # Add BorrowingEvent triples
        g.add((event_uri, RDF.type, EX.BorrowingEvent))
        g.add((event_uri, EX.HAS_BOOK, URIRef(book_id)))
        g.add((event_uri, EX.HAS_BORROWER, borrower_uri))
        g.add((event_uri, EX.HAS_DATE, Literal(borrow_date, datatype=XSD.date)))

        # Add Borrower
        borrower_class = EX.Student if borrower_type == 'Student' else EX.Faculty
        g.add((borrower_uri, RDF.type, borrower_class))
        g.add((borrower_uri, EX.HAS_NAME, Literal(borrower_name)))

        # Update Book state to 'Borrowed'
        g.set((URIRef(book_id), EX.state, Literal("Borrowed")))

        # Save the updated graph
        g.serialize(destination=ontology_file, format='turtle')

        return jsonify({'message': 'Book borrowed successfully'}), 200

    except Exception as e:
        logging.error(f"Error updating ontology: {e}")
        return jsonify({'error': 'Failed to update ontology', 'details': str(e)}), 500

# Endpoint to handle returning a book
@app.route('/api/return', methods=['POST'])
def return_book():
    data = request.json
    book_id = data.get('book_id')  # Book URI

    if not book_id:
        return jsonify({'error': 'Missing book ID'}), 400

    try:
        ontology_file = 'docker/import/ontology.ttl'
        g = Graph()
        g.parse(ontology_file, format='turtle')

        # Bind namespace
        g.bind("ex", EX)

        # Find and remove the BorrowingEvent for this book
        borrowing_events = list(g.subjects(RDF.type, EX.BorrowingEvent))
        for event in borrowing_events:
            event_book = g.value(event, EX.HAS_BOOK)
            if str(event_book) == book_id:
                g.remove((event, None, None))  # Remove all triples for the BorrowingEvent
                break

        # Update Book state to 'Present'
        g.set((URIRef(book_id), EX.state, Literal("Present")))

        # Save the updated graph
        g.serialize(destination=ontology_file, format='turtle')

        return jsonify({'message': 'Book returned successfully'}), 200

    except Exception as e:
        logging.error(f"Error updating ontology: {e}")
        return jsonify({'error': 'Failed to update ontology', 'details': str(e)}), 500

# Endpoint to clear all borrowing data
@app.route('/api/clear_borrowing_data', methods=['POST'])
def clear_borrowing_data():
    try:
        ontology_file = 'docker/import/ontology.ttl'
        g = Graph()
        g.parse(ontology_file, format='turtle')

        # Bind namespace
        g.bind("ex", EX)

        # Remove all BorrowingEvent triples
        borrowing_events = list(g.subjects(RDF.type, EX.BorrowingEvent))
        for event in borrowing_events:
            g.remove((event, None, None))

        # Reset the state of all books to 'Present'
        for book in g.subjects(RDF.type, EX.Book):
            g.set((book, EX.state, Literal("Present")))

        # Save the updated graph
        g.serialize(destination=ontology_file, format='turtle')

        return jsonify({'message': 'All borrowing data cleared successfully'}), 200

    except Exception as e:
        logging.error(f"Error clearing borrowing data: {e}")
        return jsonify({'error': 'Failed to clear borrowing data', 'details': str(e)}), 500

# API endpoint to fetch a specific entity
@app.route('/api/entity', methods=['GET'])
def get_entity():
    entity_type = request.args.get('type')
    entity_id = request.args.get('id')

    if not entity_type or not entity_id:
        return jsonify({'error': 'Missing type or id parameter'}), 400

    try:
        ontology_file = 'docker/import/ontology.ttl'
        g = Graph()
        g.parse(ontology_file, format='turtle')

        # Bind namespace
        g.bind("ex", EX)

        entity_uri = URIRef(f"http://example.org/library#{entity_id}")

        # Check if the entity exists and matches the type
        if (entity_uri, RDF.type, EX[entity_type]) not in g:
            return jsonify({'error': 'Entity not found'}), 404

        # Gather properties
        properties = {}
        for p, o in g.predicate_objects(entity_uri):
            if p == RDF.type:
                continue
            prop_name = p.split('#')[-1]
            if isinstance(o, URIRef):
                # Get the name if available
                name = g.value(o, EX.HAS_NAME)
                if name:
                    properties[prop_name] = {'id': str(o), 'name': str(name)}
                else:
                    properties[prop_name] = str(o)
            else:
                properties[prop_name] = str(o)

        return jsonify({
            'id': str(entity_uri),
            'type': entity_type,
            'properties': properties
        })

    except Exception as e:
        logging.error(f"Error fetching entity: {e}")
        return jsonify({'error': 'Failed to fetch entity', 'details': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
