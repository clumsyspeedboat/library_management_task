// static/js/index.js

window.onload = function () {
    // Initialize the graph network variable
    let network = null;

    /**
     * Extracts the fragment identifier from a full URI.
     * @param {string} uri - The full URI (e.g., "http://example.org/library#b2").
     * @returns {string} The fragment identifier (e.g., "b2").
     */
    function getIdFromURI(uri) {
        const parts = uri.split('#');
        return parts.length > 1 ? parts[1] : uri;
    }

    // Function to load table data from the backend
    function loadTableData() {
        document.getElementById('loading').style.display = 'flex';

        fetch('/api/books')
            .then(response => response.json())
            .then(data => {
                const books = data.books;
                const bookTable = document.getElementById('book-table');
                const borrowBookSelect = document.getElementById('borrowBookId');
                const returnBookSelect = document.getElementById('returnBookId');

                // Clear existing table and dropdown options
                bookTable.innerHTML = '';
                borrowBookSelect.innerHTML = '<option value="">Select a Book</option>';
                returnBookSelect.innerHTML = '<option value="">Select a Book</option>';

                books.forEach(book => {
                    const row = document.createElement('tr');
                    row.setAttribute('data-id', book.id);

                    // Create table row with updated viewer links
                    row.innerHTML = `<td>${book.id}</td>
                        <td><a href="viewer.html?type=Book&id=${encodeURIComponent(getIdFromURI(book.id))}" target="_blank">${book.title}</a></td>
                        <td><a href="viewer.html?type=Author&id=${encodeURIComponent(getIdFromURI(book.author.id))}" target="_blank">${book.author.name}</a></td>
                        <td><a href="viewer.html?type=Publisher&id=${encodeURIComponent(getIdFromURI(book.publisher.id))}" target="_blank">${book.publisher.name}</a></td>
                        <td><a href="viewer.html?type=Genre&id=${encodeURIComponent(getIdFromURI(book.genre.id))}" target="_blank">${book.genre.name}</a></td>
                        <td>${book.borrowed ? book.borrower_name : ''}</td>
                        <td>${book.borrowed ? book.borrower_type : ''}</td>
                        <td>${book.borrowed ? book.borrow_date : ''}</td>
                        <td>${book.borrowed ? book.return_date : ''}</td>
                        <td>${book.state}</td>`;

                    if (book.borrowed) {
                        row.classList.add('borrowed');
                        // Add to return dropdown
                        const returnOption = document.createElement('option');
                        returnOption.value = book.id;
                        returnOption.textContent = `${getIdFromURI(book.id)} - ${book.title}`;
                        returnBookSelect.appendChild(returnOption);
                    } else {
                        // Add to borrow dropdown
                        const borrowOption = document.createElement('option');
                        borrowOption.value = book.id;
                        borrowOption.textContent = `${getIdFromURI(book.id)} - ${book.title}`;
                        borrowBookSelect.appendChild(borrowOption);
                    }

                    bookTable.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching books:', error);
            })
            .finally(() => {
                document.getElementById('loading').style.display = 'none';
            });
    }

    // Call loadTableData on page load
    loadTableData();

    // Function to fetch and render graph
    function renderGraph() {
        document.getElementById('loading').style.display = 'flex';
        fetch('/api/ontology_graph')
            .then(response => response.json())
            .then(data => {
                const nodes = new vis.DataSet(data.nodes.map(node => ({
                    id: node.id,
                    label: node.label,
                    group: node.group || 'Other',  // Assign group for styling
                    title: `Group: ${node.group || 'Other'}` // Tooltip
                })));

                const edges = new vis.DataSet(data.edges.map(edge => ({
                    from: edge.from,
                    to: edge.to,
                    label: edge.label,
                    arrows: 'to',
                    smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 }
                })));

                const container = document.getElementById('network');
                const graphData = {
                    nodes: nodes,
                    edges: edges
                };
                const options = {
                    layout: {
                        hierarchical: false
                    },
                    edges: {
                        arrows: {
                            to: { enabled: true, scaleFactor: 0.5 }
                        },
                        font: {
                            align: 'top'
                        }
                    },
                    physics: {
                        enabled: true,
                        stabilization: {
                            iterations: 1000
                        }
                    },
                    interaction: {
                        hover: true,
                        navigationButtons: true,
                        keyboard: true
                    },
                    groups: {
                        Book: { color: { background: '#FF5733' }, shape: 'box' },
                        Author: { color: { background: '#33FF57' }, shape: 'ellipse' },
                        Publisher: { color: { background: '#3357FF' }, shape: 'diamond' },
                        Genre: { color: { background: '#F1C40F' }, shape: 'hexagon' },
                        BorrowingEvent: { color: { background: '#FF6347' }, shape: 'triangle' },
                        Student: { color: { background: '#8A2BE2' }, shape: 'circle' },
                        Faculty: { color: { background: '#2E8B57' }, shape: 'circle' },
                        Library: { color: { background: '#9B59B6' }, shape: 'star' },
                        Other: { color: { background: '#7F8C8D' }, shape: 'circle' }
                    }
                };

                network = new vis.Network(container, graphData, options);

                // Add click event to nodes
                network.on("click", function (params) {
                    if (params.nodes.length > 0) {
                        const nodeId = params.nodes[0];
                        // Determine the type of node to navigate appropriately
                        const nodeGroup = data.nodes.find(node => node.id === nodeId)?.group || 'Other';
                        let type = '';
                        let id = '';
                        if (nodeGroup === 'Book') {
                            type = 'Book';
                            id = getIdFromURI(nodeId);
                        } else if (nodeGroup === 'Author') {
                            type = 'Author';
                            id = getIdFromURI(nodeId);
                        } else if (nodeGroup === 'Publisher') {
                            type = 'Publisher';
                            id = getIdFromURI(nodeId);
                        } else if (nodeGroup === 'Genre') {
                            type = 'Genre';
                            id = getIdFromURI(nodeId);
                        } else {
                            return;
                        }
                        window.open(`viewer.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`, '_blank');
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching graph data:', error);
            })
            .finally(() => {
                document.getElementById('loading').style.display = 'none';
            });
    }

    // Handle Toggle Switch
    document.getElementById('viewToggle').addEventListener('change', function () {
        const tableView = document.getElementById('tableView');
        const networkView = document.getElementById('network');

        if (this.checked) {
            // Switch to Graph View
            tableView.style.display = 'none';
            networkView.style.display = 'block';
            // Render graph
            renderGraph();
        } else {
            // Switch to Table View
            tableView.style.display = 'table';
            networkView.style.display = 'none';
        }
    });

    // Handle Borrow Form Submission
    document.getElementById('borrowForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const bookId = document.getElementById('borrowBookId').value;
        const borrowerName = document.getElementById('borrowerName').value.trim();
        const borrowerType = document.getElementById('borrowerType').value;
        const borrowDate = document.getElementById('borrowDate').value;

        if (!bookId || !borrowerName || !borrowDate || !borrowerType) {
            alert('Please fill in all fields.');
            return;
        }

        if (!confirm(`Are you sure you want to borrow Book ID ${getIdFromURI(bookId)}?`)) {
            return;
        }

        fetch('/api/borrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book_id: bookId,
                borrower_name: borrowerName,
                borrower_type: borrowerType,
                borrow_date: borrowDate
            }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(`Error: ${data.error}`);
                } else {
                    alert(data.message || 'Book borrowed successfully!');
                    // Refresh table and graph
                    loadTableData();
                    if (document.getElementById('viewToggle').checked && network) {
                        renderGraph();
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to borrow the book. Please try again.');
            });
    });

    // Handle Return Form Submission
    document.getElementById('returnForm').addEventListener('submit', function (event) {
        event.preventDefault();
        const bookId = document.getElementById('returnBookId').value;
        const returnDateInput = document.getElementById('returnDate').value;

        if (!bookId || !returnDateInput) {
            alert('Please fill in all fields.');
            return;
        }

        if (!confirm(`Are you sure you want to return Book ID ${getIdFromURI(bookId)}?`)) {
            return;
        }

        fetch('/api/return', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ book_id: bookId }),
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(`Error: ${data.error}`);
                } else {
                    alert(data.message || 'Book returned successfully!');
                    // Refresh table and graph
                    loadTableData();
                    if (document.getElementById('viewToggle').checked && network) {
                        renderGraph();
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to return the book. Please try again.');
            });
    });

    // Clear borrowing data
    document.getElementById('clearDataBtn').addEventListener('click', function () {
        if (confirm('Are you sure you want to clear all borrowing data? This action cannot be undone.')) {
            fetch('/api/clear_borrowing_data', {
                method: 'POST',
            })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert(`Error: ${data.error}`);
                    } else {
                        alert(data.message || 'All borrowing data cleared successfully!');
                        // Refresh table and graph
                        loadTableData();
                        if (document.getElementById('viewToggle').checked && network) {
                            renderGraph();
                        }
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Failed to clear borrowing data. Please try again.');
                });
        }
    });
};
