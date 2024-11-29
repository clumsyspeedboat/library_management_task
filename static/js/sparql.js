document.addEventListener('DOMContentLoaded', function () {
    const sparqlForm = document.getElementById('sparqlForm');
    const resultsContainer = document.getElementById('resultsContainer');
    const resultsHead = document.getElementById('resultsHead');
    const resultsBody = document.getElementById('resultsBody');
    const loadingSpinner = document.getElementById('loadingSpinner');

    const useEndpointRadio = document.getElementById('useEndpoint');
    const useTurtleFileRadio = document.getElementById('useTurtleFile');
    const endpointInputDiv = document.getElementById('endpointInput');

    // Toggle input fields based on selected data source
    useEndpointRadio.addEventListener('change', toggleDataSource);
    useTurtleFileRadio.addEventListener('change', toggleDataSource);

    function toggleDataSource() {
        if (useEndpointRadio.checked) {
            endpointInputDiv.style.display = 'block';
        } else if (useTurtleFileRadio.checked) {
            endpointInputDiv.style.display = 'none';
        }
    }

    sparqlForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Prevent form from submitting traditionally

        // Get form values
        const query = document.getElementById('sparqlQuery').value.trim();

        // Basic validation
        if (!query) {
            alert('Please provide the SPARQL query or update.');
            return;
        }

        // Clear previous results
        resultsHead.innerHTML = '';
        resultsBody.innerHTML = '';
        resultsContainer.style.display = 'none';

        // Show loading spinner
        loadingSpinner.style.display = 'block';

        // Determine data source
        let formData = new FormData();
        formData.append('query', query);

        if (useEndpointRadio.checked) {
            const endpoint = document.getElementById('sparqlEndpoint').value.trim();

            if (!endpoint) {
                alert('Please provide the SPARQL endpoint URL.');
                loadingSpinner.style.display = 'none';
                return;
            }

            formData.append('dataSource', 'endpoint');
            formData.append('endpoint', endpoint);
        } else if (useTurtleFileRadio.checked) {
            formData.append('dataSource', 'turtleFile');
        }

        // Send POST request to /api/sparql
        fetch('/api/sparql', {
            method: 'POST',
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                // Hide loading spinner
                loadingSpinner.style.display = 'none';

                if (data.error) {
                    alert(`Error: ${data.error}\n${data.message || ''}`);
                    return;
                }

                // Check if it's an ASK query response
                if (data.hasOwnProperty('boolean')) {
                    // Display ASK query result
                    const askResult = data.boolean;
                    resultsContainer.style.display = 'block';
                    resultsHead.innerHTML = `<tr><th>Result</th></tr>`;
                    resultsBody.innerHTML = `<tr><td>${askResult}</td></tr>`;
                }
                // Check if it's a SELECT query response
                else if (data.hasOwnProperty('variables') && data.hasOwnProperty('results')) {
                    const vars = data.variables;
                    const bindings = data.results;

                    // Populate table headers
                    const headersRow = document.createElement('tr');
                    vars.forEach(varName => {
                        const th = document.createElement('th');
                        th.textContent = varName;
                        headersRow.appendChild(th);
                    });
                    resultsHead.appendChild(headersRow);

                    // Populate table rows
                    bindings.forEach(rowData => {
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
                }
                // Handle SPARQL Update result
                else if (data.message) {
                    alert(data.message);
                } else {
                    alert('Unexpected response from server.');
                }
            })
            .catch(error => {
                loadingSpinner.style.display = 'none';
                console.error('Error:', error);
                alert('An error occurred while executing the SPARQL query.');
            });
    });
});
