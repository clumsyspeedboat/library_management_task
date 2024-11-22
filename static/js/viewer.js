// static/js/viewer.js

window.onload = function () {
    const params = getQueryParams();
    const type = params['type'];
    const id = params['id'];

    if (type && id) {
        displayEntity(type, id);
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
 * @param {string} entityType - The type of the entity (Book, Author, etc.).
 */
async function fetchGeminiDescription(entityName, entityType) {
    console.log('Fetching description for:', entityName, 'Type:', entityType); // Debug
    try {
        const response = await fetch(`/api/description?name=${encodeURIComponent(entityName)}&type=${encodeURIComponent(entityType)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log('Fetch response status:', response.status); // Debug

        if (response.status === 400) {
            throw new Error('Invalid request. Entity name or type is missing.');
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
 * Displays the details of a specific entity based on the provided type and ID.
 * @param {string} type - The type of the entity (e.g., 'Book', 'Author').
 * @param {string} id - The ID of the entity to display.
 */
async function displayEntity(type, id) {
    try {
        const response = await fetch(`/api/entity?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
        if (response.status === 404) {
            document.getElementById('content').innerHTML = '<p>Entity not found.</p>';
            return;
        }
        if (!response.ok) {
            throw new Error('Failed to fetch entity data.');
        }
        const data = await response.json();
        const properties = data.properties;
        const entityName = properties.HAS_NAME ? properties.HAS_NAME.name || properties.HAS_NAME : '';

        // Build the HTML content
        let htmlContent = `<h1>${data.type} Details</h1><ul>`;

        for (const [prop, value] of Object.entries(properties)) {
            if (typeof value === 'object' && value.name) {
                htmlContent += `<li><strong>${prop}:</strong> <a href="viewer.html?type=${encodeURIComponent(getTypeFromProperty(prop))}&id=${encodeURIComponent(getIdFromURI(value.id))}" target="_blank">${value.name}</a></li>`;
            } else {
                htmlContent += `<li><strong>${prop}:</strong> ${value}</li>`;
            }
        }

        htmlContent += '</ul>';

        // If viewing a Book, display borrowing details
        if (data.type === 'Book') {
            // Fetch borrowing details from /api/books
            const booksResponse = await fetch('/api/books');
            const booksData = await booksResponse.json();
            const book = booksData.books.find(b => b.id === data.id);
            if (book && book.borrowed) {
                htmlContent += `<h2>Borrowing Details</h2><ul>
                    <li><strong>Borrower:</strong> ${book.borrower_name}</li>
                    <li><strong>Borrower Type:</strong> ${book.borrower_type}</li>
                    <li><strong>Borrow Date:</strong> ${book.borrow_date}</li>
                    <li><strong>Return Date:</strong> ${book.return_date}</li>
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
            fetchGeminiDescription(entityName, type);
        }

    } catch (error) {
        console.error('Error displaying entity:', error);
        document.getElementById('content').innerHTML = `<p>Error loading entity details.</p>`;
    }
}

/**
 * Maps the property name to the corresponding entity type.
 * @param {string} prop - The property name.
 * @returns {string} The corresponding entity type.
 */
function getTypeFromProperty(prop) {
    const propertyMap = {
        'HAS_AUTHOR': 'Author',
        'HAS_PUBLISHER': 'Publisher',
        'HAS_GENRE': 'Genre'
    };
    return propertyMap[prop] || 'User';
}

/**
 * Extracts the ID from a full URI.
 * @param {string} uri - The full URI of the entity.
 * @returns {string} The extracted ID.
 */
function getIdFromURI(uri) {
    const parts = uri.split('#');
    return parts.length > 1 ? parts[1] : uri;
}
