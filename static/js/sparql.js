// sparql.js

document.addEventListener('DOMContentLoaded', function () {
    const sparqlForm = document.getElementById('sparqlForm');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsHead = document.getElementById('resultsHead');
    const resultsBody = document.getElementById('resultsBody');

    sparqlForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent form from submitting traditionally

        // Get form values
        const endpoint = document.getElementById('sparqlEndpoint').value.trim();
        const query = document.getElementById('sparqlQuery').value.trim();

        // Basic validation
        if (!endpoint || !query) {
            alert('Please provide both the SPARQL endpoint and the query.');
            return;
        }

        // Clear previous results
        resultsHead.innerHTML = '';
        resultsBody.innerHTML = '';
        resultsContainer.style.display = 'none';

        // Prepare payload
        const payload = {
            endpoint: endpoint,
            query: query
        };

        // Send POST request to /api/sparql
        fetch('/api/sparql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(`Error: ${data.error}\n${data.message || ''}`);
                    return;
                }

                // Populate table headers
                const vars = data.variables;
                const headersRow = document.createElement('tr');
                vars.forEach(varName => {
                    const th = document.createElement('th');
                    th.textContent = varName;
                    headersRow.appendChild(th);
                });
                resultsHead.appendChild(headersRow);

                // Populate table rows
                data.results.forEach(rowData => {
                    const tr = document.createElement('tr');
                    vars.forEach(varName => {
                        const td = document.createElement('td');
                        td.textContent = rowData[varName] || '';
                        tr.appendChild(td);
                    });
                    resultsBody.appendChild(tr);
                });

                // Show results container
                resultsContainer.style.display = 'block';
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while executing the SPARQL query.');
            });
    });
});

const loadingSpinner = document.getElementById('loadingSpinner');

sparqlForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // Show loading spinner
    loadingSpinner.style.display = 'block';

    // Hide results container
    resultsContainer.style.display = 'none';

    // ... existing code ...

    fetch('/api/sparql', {
        // ... existing code ...
    })
        .then(response => response.json())
        .then(data => {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';

            // ... existing code ...
        })
        .catch(error => {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';

            // ... existing code ...
        });
});