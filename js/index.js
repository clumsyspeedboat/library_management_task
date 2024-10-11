window.onload = function () {
    // Fetch all XML data concurrently
    Promise.all([
        fetch('data/authors.xml').then(response => response.text()),
        fetch('data/publishers.xml').then(response => response.text()),
        fetch('data/books.xml').then(response => response.text()),
        fetch('data/genres.xml').then(response => response.text()) // Fetch genres.xml
    ]).then(([authorsData, publishersData, booksData, genresData]) => {
        const parser = new DOMParser();

        // Parse authors.xml
        const authorsDoc = parser.parseFromString(authorsData, "application/xml");
        const authors = {};
        const authorsList = authorsDoc.getElementsByTagName('Author');
        for (let i = 0; i < authorsList.length; i++) {
            const author = authorsList[i];
            const id = author.getAttribute('id');
            const name = author.getElementsByTagName('Name')[0].textContent;
            authors[id] = name;
        }

        // Parse publishers.xml
        const publishersDoc = parser.parseFromString(publishersData, "application/xml");
        const publishers = {};
        const publishersList = publishersDoc.getElementsByTagName('Publisher');
        for (let i = 0; i < publishersList.length; i++) {
            const publisher = publishersList[i];
            const id = publisher.getAttribute('id');
            const name = publisher.getElementsByTagName('Name')[0].textContent;
            publishers[id] = name;
        }

        // Parse genres.xml
        const genresDoc = parser.parseFromString(genresData, "application/xml");
        const genres = {};
        const genresList = genresDoc.getElementsByTagName('Genre');
        for (let i = 0; i < genresList.length; i++) {
            const genre = genresList[i];
            const id = genre.getAttribute('id');
            const name = genre.getElementsByTagName('Name')[0].textContent;
            genres[id] = name;
        }

        // Parse books.xml
        const booksDoc = parser.parseFromString(booksData, "application/xml");
        const books = booksDoc.getElementsByTagName('Book');
        const bookTable = document.getElementById('book-table');

        // Retrieve borrowing data from LocalStorage
        const borrowingData = JSON.parse(localStorage.getItem('borrowingData')) || {};

        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            const id = book.getAttribute('id');
            const title = book.getElementsByTagName('Title')[0].textContent;

            // Fetch Author
            const authorElement = book.getElementsByTagName('Author')[0];
            const authorHref = authorElement.getAttribute('xlink:href');
            const authorId = authorHref.split('#')[1];
            const authorName = authors[authorId] || 'Unknown';

            // Fetch Publisher
            const publisherElement = book.getElementsByTagName('Publisher')[0];
            const publisherHref = publisherElement.getAttribute('xlink:href');
            const publisherId = publisherHref.split('#')[1];
            const publisherName = publishers[publisherId] || 'Unknown';

            // Fetch Genre
            const genreElement = book.getElementsByTagName('Genre')[0];
            const genreHref = genreElement.getAttribute('xlink:href');
            const genreId = genreHref.split('#')[1];
            const genreName = genres[genreId] || 'Unknown';

            // Create table row for each book
            const row = document.createElement('tr');
            row.setAttribute('data-id', id);

            // Check if book is borrowed
            const isBorrowed = borrowingData[id] ? true : false;

            // Populate row with book details, including genre
            row.innerHTML = `<td>${id}</td>
                             <td><a href="viewer.html?file=books.xml&id=${id}" target="_blank">${title}</a></td>
                             <td><a href="viewer.html?file=authors.xml&id=${authorId}" target="_blank">${authorName}</a></td>
                             <td><a href="viewer.html?file=publishers.xml&id=${publisherId}" target="_blank">${publisherName}</a></td>
                             <td><a href="viewer.html?file=genres.xml&id=${genreId}" target="_blank">${genreName}</a></td> <!-- Genre Column -->
                             <td>${isBorrowed ? borrowingData[id].borrowerName : ''}</td>
                             <td>${isBorrowed ? borrowingData[id].borrowDate : ''}</td>
                             <td>${isBorrowed ? borrowingData[id].returnDate : ''}</td>
                             <td>${isBorrowed ? 'Borrowed' : 'Present'}</td>`;
            bookTable.appendChild(row);
        }
    }).catch(error => {
        console.error('Error fetching or parsing XML files:', error);
    });
};
