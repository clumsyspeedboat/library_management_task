// viewer.js

window.onload = function () {
    const params = getQueryParams();
    const file = params['file'];
    const id = params['id'];

    if (file && id) {
        displayEntity(file, id);
    } else {
        document.getElementById('content').innerHTML = '<p>Invalid parameters.</p>';
    }
};

/**
 * Function to retrieve query parameters from the URL.
 * @returns {Object} An object containing key-value pairs of query parameters.
 */
function getQueryParams() {
    const params = {};
    window.location.search.substring(1).split("&").forEach(pair => {
        const [key, value] = pair.split("=");
        if (key) {
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    });
    return params;
}

/**
 * Fetches a description from the Gemini API for the given entity.
 * @param {string} entityName - The name of the entity (book, author, genre, etc.).
 */
async function fetchGeminiDescription(entityName) {
    console.log('Fetching description for:', entityName); // Debug
    try {
        const response = await fetch(`/api/description?name=${encodeURIComponent(entityName)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Fetch response status:', response.status); // Debug

        if (response.status === 400) {
            throw new Error('Invalid request. Entity name is missing.');
        } else if (response.status === 500) {
            throw new Error('Server error while fetching description.');
        } else if (!response.ok) {
            throw new Error('Unexpected error occurred.');
        }

        const data = await response.json();
        console.log('Received data:', data); // Debug
        const descriptionMarkdown = data.description || 'No description available.';

        // Convert Markdown to HTML using Marked.js
        const descriptionHTML = marked.parse(descriptionMarkdown);

        // Display the description in the "description" div
        document.getElementById('description').innerHTML = `<h2>Description</h2>${descriptionHTML}`;
    } catch (error) {
        console.error('Error fetching description from Gemini API:', error);
        document.getElementById('description').innerHTML = `<p>${error.message}</p>`;
    }
}

/**
 * Asynchronously fetches and parses an XML file.
 * @param {string} filePath - The relative path to the XML file.
 * @returns {Promise<Document>} A promise that resolves to the parsed XML Document.
 */
async function fetchXML(filePath) {
    try {
        const response = await fetch(`/static/data/${filePath}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
        }
        const textData = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(textData, "application/xml");
        
        // Check for parsing errors
        const parserError = xmlDoc.getElementsByTagName("parsererror");
        if (parserError.length > 0) {
            throw new Error(`Error parsing ${filePath}`);
        }

        return xmlDoc;
    } catch (error) {
        console.error(`Error fetching/parsing ${filePath}:`, error);
        throw error;
    }
}

/**
 * Parses entities from an XML Document.
 * @param {Document} xmlDoc - The parsed XML Document.
 * @param {string} entityName - The tag name of the entities to parse (e.g., 'Author', 'Publisher').
 * @returns {Object} An object mapping entity IDs to their names.
 */
function parseEntities(xmlDoc, entityName) {
    const entities = {};
    const elements = xmlDoc.getElementsByTagName(entityName);
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const id = element.getAttribute('id');
        const nameElement = element.getElementsByTagName('Name')[0];
        const name = nameElement ? nameElement.textContent : 'Unknown';
        entities[id] = name;
    }
    return entities;
}

/**
 * Displays the details of a specific entity based on the provided file and ID.
 * @param {string} file - The XML file to fetch (e.g., 'books.xml', 'authors.xml').
 * @param {string} id - The ID of the entity to display.
 */
async function displayEntity(file, id) {
    try {
        // Fetch and parse the main XML file
        const mainDoc = await fetchXML(file);
        
        // Select the entity by its ID
        const entity = mainDoc.querySelector(`[id='${id}']`);
        if (!entity) {
            document.getElementById('content').innerHTML = '<p>Entity not found.</p>';
            return;
        }

        // Determine the entity type based on the entity's localName
        const entityType = entity.localName;

        // Initialize variables for linked entities
        let authors = {};
        let publishers = {};
        let genres = {};
        let books = {};

        // Collect linked files from child elements
        const linkedFiles = new Set();
        let entityName = '';

        for (let i = 0; i < entity.children.length; i++) {
            const child = entity.children[i];
            const xlinkHref = child.getAttribute('xlink:href');
            if (xlinkHref) {
                const [filePath, linkedId] = xlinkHref.split('#');
                linkedFiles.add(filePath);
            } else if (child.localName === 'Title' || child.localName === 'Name') {
                entityName = child.textContent; // Get the entity name to pass to Gemini
            }
        }

        // Fetch and parse linked XML files
        const linkedPromises = Array.from(linkedFiles).map(filePath => fetchXML(filePath));
        const linkedDocs = await Promise.all(linkedPromises);

        // Parse linked entities
        linkedDocs.forEach(doc => {
            const rootName = doc.documentElement.localName;
            if (rootName === 'Authors') {
                authors = { ...authors, ...parseEntities(doc, 'Author') };
            } else if (rootName === 'Publishers') {
                publishers = { ...publishers, ...parseEntities(doc, 'Publisher') };
            } else if (rootName === 'Genres') {
                genres = { ...genres, ...parseEntities(doc, 'Genre') };
            } else if (rootName === 'Books') {
                books = { ...books, ...parseEntities(doc, 'Book') };
            }
        });

        // Build the HTML content
        let htmlContent = `<h1>${entityType} Details</h1><ul>`;

        for (let i = 0; i < entity.children.length; i++) {
            const child = entity.children[i];
            const childName = child.localName;
            const childText = child.textContent;
            const xlinkHref = child.getAttribute('xlink:href');

            if (xlinkHref) {
                const [filePath, linkedId] = xlinkHref.split('#');
                let linkedEntityType = '';

                switch (filePath) {
                    case 'authors.xml':
                        linkedEntityType = 'Author';
                        break;
                    case 'publishers.xml':
                        linkedEntityType = 'Publisher';
                        break;
                    case 'genres.xml':
                        linkedEntityType = 'Genre';
                        break;
                    case 'books.xml':
                        linkedEntityType = 'Book';
                        break;
                    default:
                        linkedEntityType = 'Unknown';
                }

                // Determine the linked entity's name
                let linkedName = 'Unknown';
                if (filePath === 'authors.xml' && authors[linkedId]) {
                    linkedName = authors[linkedId];
                } else if (filePath === 'publishers.xml' && publishers[linkedId]) {
                    linkedName = publishers[linkedId];
                } else if (filePath === 'genres.xml' && genres[linkedId]) {
                    linkedName = genres[linkedId];
                } else if (filePath === 'books.xml' && books[linkedId]) {
                    linkedName = books[linkedId];
                }

                // Create hyperlink to the linked entity
                htmlContent += `<li><strong>${childName}:</strong> <a href="viewer.html?file=${filePath}&id=${linkedId}" target="_blank">${linkedName}</a></li>`;
            } else {
                // Regular text content
                htmlContent += `<li><strong>${childName}:</strong> ${childText}</li>`;
            }
        }

        htmlContent += '</ul>';

        // If viewing a Book, display borrowing details
        if (entityType === 'Book') {
            const borrowingData = JSON.parse(localStorage.getItem('borrowingData')) || {};
            const borrowingDetails = borrowingData[id];

            if (borrowingDetails) {
                htmlContent += `<h2>Borrowing Details</h2><ul>
                    <li><strong>Borrower:</strong> ${borrowingDetails.borrowerName}</li>
                    <li><strong>Borrow Date:</strong> ${borrowingDetails.borrowDate}</li>
                    <li><strong>Return Date:</strong> ${borrowingDetails.returnDate}</li>
                </ul>`;
            } else {
                htmlContent += `<p>This book is currently available for borrowing.</p>`;
            }
        }

        // Add a back link to the main catalog
        htmlContent += `<a href="/" class="back-link">&larr; Back to Catalog</a>`;

        // Display the content
        document.getElementById('content').innerHTML = htmlContent;

        // Fetch and display the Gemini description (if entityName exists)
        if (entityName) {
            fetchGeminiDescription(entityName);
        }

    } catch (error) {
        console.error('Error displaying entity:', error);
        document.getElementById('content').innerHTML = `<p>Error loading entity details.</p>`;
    }
}
